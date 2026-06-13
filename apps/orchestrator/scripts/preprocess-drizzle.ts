/**
 * db:pull
 *
 * Ejecuta drizzle-kit pull, mueve los archivos generados a src/lib/server/db/,
 * y parchea schema.ts con los overrides de .$type<>() definidos en OVERRIDES abajo.
 *
 * Uso (package.json):
 *   "db:pull": "NODE_OPTIONS='--import tsx' tsx scripts/preprocess-drizzle.ts"
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import path from 'path';
import { Project, SyntaxKind, Node, type SourceFile } from 'ts-morph';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const DRIZZLE_TMP_DIR = path.resolve('drizzle');
const DB_DIR = path.resolve('src/lib/server/db');

// Archivos que genera drizzle-kit pull que queremos conservar
const KEEP_FILES = ['schema.ts', 'relations.ts'];

// ---------------------------------------------------------------------------
// Definición de overrides de tipos
//
// Clave:  "nombreTabla.nombreColumna"  (camelCase, tal como aparece en el schema)
// Valor:  el tipo TypeScript a inyectar — debe ser importable desde ./enums
//         o ser una unión literal (ej. '"a" | "b"')
// ---------------------------------------------------------------------------

interface Override {
	/** Tipo TS completamente calificado, ej. 'ContribuyenteEstado' o '"a" | "b"' */
	type: string;
	/**
	 * Si el tipo proviene de ./enums, indicarlo aquí para que se agregue el import.
	 * Dejar vacío para uniones literales inline.
	 */
	importFrom?: string;
}

const OVERRIDES: Record<string, Override> = {};

// ---------------------------------------------------------------------------
// Paso 1: ejecutar drizzle-kit pull
// ---------------------------------------------------------------------------

console.log('→ Ejecutando drizzle-kit pull…');
execSync('pnpm exec drizzle-kit pull', { stdio: 'inherit' });

// ---------------------------------------------------------------------------
// Paso 2: mover archivos a DB_DIR, descartar archivos de migración
// ---------------------------------------------------------------------------

console.log(`→ Moviendo archivos a ${DB_DIR}…`);
mkdirSync(DB_DIR, { recursive: true });

const generated = readdirSync(DRIZZLE_TMP_DIR);
for (const file of generated) {
	if (KEEP_FILES.includes(file)) {
		const src = path.join(DRIZZLE_TMP_DIR, file);
		const dest = path.join(DB_DIR, file);
		copyFileSync(src, dest);
		console.log(`  copiado ${file}`);
	}
}

rmSync(DRIZZLE_TMP_DIR, { recursive: true, force: true });
console.log('  directorio temporal drizzle/ eliminado');

// ---------------------------------------------------------------------------
// Paso 3: parchear schema.ts con los overrides de .$type<>() via ts-morph
// ---------------------------------------------------------------------------

const schemaPath = path.join(DB_DIR, 'schema.ts');

if (!existsSync(schemaPath)) {
	console.error(`✗ schema.ts no encontrado en ${schemaPath}`);
	process.exit(1);
}

console.log('→ Parcheando schema.ts con overrides de tipos…');

const project = new Project();
const sourceFile = project.addSourceFileAtPath(schemaPath);

// Recolectar qué tipos necesitan ser importados y desde dónde
const neededImports = new Map<string, Set<string>>();

for (const [tableColumn, override] of Object.entries(OVERRIDES)) {
	const [tableName, columnName] = tableColumn.split('.');

	// Buscar la declaración de variable para esta tabla
	const tableDecl = sourceFile.getVariableDeclaration(tableName);
	if (!tableDecl) {
		console.warn(`  ⚠ tabla "${tableName}" no encontrada en el schema, omitiendo`);
		continue;
	}

	// Entrar en la llamada pgTable(…) → segundo argumento (objeto de definición de columnas)
	const initializer = tableDecl.getInitializerIfKind(SyntaxKind.CallExpression);
	if (!initializer) continue;

	const args = initializer.getArguments();
	// args[0] = string con el nombre de la tabla, args[1] = objeto de columnas
	const columnsArg = args[1];
	if (!columnsArg || !Node.isObjectLiteralExpression(columnsArg)) continue;

	const prop = columnsArg.getProperty(columnName);
	if (!prop || !Node.isPropertyAssignment(prop)) {
		console.warn(`  ⚠ columna "${columnName}" no encontrada en la tabla "${tableName}", omitiendo`);
		continue;
	}

	// El valor de la columna es una cadena de llamadas: text("col").notNull().default(…) etc.
	// Necesitamos insertar .$type<Override>() justo después de la primera llamada (el
	// constructor del tipo de columna) y antes de cualquier modificador.
	//
	// Estrategia: encontrar el CallExpression más interno (el constructor de la columna),
	// luego reescribir toda la cadena para inyectar .$type<>() en la posición 1.

	const columnExpr = prop.getInitializerIfKind(SyntaxKind.CallExpression);
	if (!columnExpr) continue;

	const currentText = columnExpr.getText();

	// Verificar si .$type<> ya está presente — no agregar duplicados
	if (currentText.includes('.$type<')) {
		console.log(`  ~ ${tableColumn} ya tiene .$type<>, actualizando…`);
		// Reemplazar el .$type<AlgunTipo>() existente con el nuevo
		const updated = currentText.replace(/\.\$type<[^>]*>\(\)/, `.$type<${override.type}>()`);
		columnExpr.replaceWithText(updated);
	} else {
		// Encontrar dónde inyectar: después de la primera llamada en la cadena.
		// La "primera llamada" termina después del paréntesis de cierre de ej. text("nombre_columna").
		// Lo hacemos encontrando la expresión de llamada más a la izquierda/interna.
		const injected = injectTypeAfterConstructor(currentText, override.type);
		columnExpr.replaceWithText(injected);
	}

	console.log(`  ✓ ${tableColumn} → $type<${override.type}>()`);

	// Registrar imports necesarios
	if (override.importFrom) {
		if (!neededImports.has(override.importFrom)) {
			neededImports.set(override.importFrom, new Set());
		}
		neededImports.get(override.importFrom)!.add(override.type);
	}
}

// ---------------------------------------------------------------------------
// Paso 4: asegurar que los imports estén presentes
// ---------------------------------------------------------------------------

for (const [moduleSpecifier, types] of neededImports) {
	const existing = sourceFile.getImportDeclaration(moduleSpecifier);

	if (existing) {
		// Mergear los named imports faltantes
		const existingNames = new Set(existing.getNamedImports().map((n) => n.getName()));
		for (const t of types) {
			if (!existingNames.has(t)) {
				existing.addNamedImport(t);
				console.log(`  + agregado import { ${t} } from '${moduleSpecifier}'`);
			}
		}
	} else {
		sourceFile.addImportDeclaration({
			moduleSpecifier,
			namedImports: [...types],
			isTypeOnly: true
		});
		console.log(`  + agregado import type { ${[...types].join(', ')} } from '${moduleSpecifier}'`);
	}
}

// ---------------------------------------------------------------------------
// Paso 5: Aplicar parches específicos sobre el schema generado
// ---------------------------------------------------------------------------

console.log('→ Aplicando parches específicos…');
removeUnusedPgCoreImport(sourceFile, 'foreignKey');

// ---------------------------------------------------------------------------
// Paso 6: guardar
// ---------------------------------------------------------------------------

sourceFile.saveSync();
console.log('✓ schema.ts guardado');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Dada una cadena de columna como:
 *   text("estado").notNull()
 *   text().notNull().default("pendiente")
 *
 * Retorna:
 *   text("estado").$type<MiTipo>().notNull()
 *   text().$type<MiTipo>().notNull().default("pendiente")
 *
 * Encontramos el fin de la primera llamada rastreando la profundidad de paréntesis.
 */
function injectTypeAfterConstructor(chain: string, typeName: string): string {
	let depth = 0;
	let i = 0;

	// Avanzar hasta el paréntesis de apertura de la primera llamada
	while (i < chain.length && chain[i] !== '(') i++;

	// Recorrer balanceando paréntesis
	for (; i < chain.length; i++) {
		if (chain[i] === '(') depth++;
		else if (chain[i] === ')') {
			depth--;
			if (depth === 0) {
				// i es el índice del paréntesis de cierre de la primera llamada
				const insertAt = i + 1;
				return chain.slice(0, insertAt) + `.$type<${typeName}>()` + chain.slice(insertAt);
			}
		}
	}

	// Fallback: agregar al final (no debería ocurrir)
	return chain + `.$type<${typeName}>()`;
}

function removeUnusedPgCoreImport(file: SourceFile, importName: string): void {
	const pgCoreImport = file.getImportDeclaration('drizzle-orm/pg-core');
	const namedImport = pgCoreImport
		?.getNamedImports()
		.find((named) => named.getName() === importName);
	if (!namedImport) return;

	const isUsedOutsideImport = file
		.getDescendantsOfKind(SyntaxKind.Identifier)
		.some(
			(identifier) =>
				identifier.getText() === importName && !Node.isImportSpecifier(identifier.getParent())
		);

	if (!isUsedOutsideImport) {
		namedImport.remove();
		console.log(`  ✓ import { ${importName} } removido porque no se usa`);
	}
}
