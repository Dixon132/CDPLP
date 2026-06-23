const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Servidor', 'src', 'modules', 'financiero', 'controllers', 'tesoreria.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add 'anio' to por_categoria
const porCategoriaTarget = `        const catMap = new Map<string, { monto: number; cantidad: number; tipo: string }>();
        movimientos.forEach((m) => {
            const cat = m.categoria ?? 'Sin categoria';
            if (!catMap.has(cat)) catMap.set(cat, { monto: 0, cantidad: 0, tipo: m.tipo_movimiento ?? 'EGRESO' });
            const entry = catMap.get(cat)!;
            entry.monto += Number(m.monto ?? 0);
            entry.cantidad += 1;
        });
        const por_categoria = Array.from(catMap.entries())
            .map(([categoria, vals]) => ({ categoria, ...vals }))
            .sort((a, b) => b.monto - a.monto);`;

const porCategoriaReplacement = `        const catMap = new Map<string, { monto: number; cantidad: number; tipo: string; anio: string }>();
        movimientos.forEach((m) => {
            const cat = m.categoria ?? 'Sin categoria';
            const anio = m.fecha_movimiento ? new Date(m.fecha_movimiento).getFullYear().toString() : 'N/A';
            const key = \`\${anio}|\${cat}\`;
            if (!catMap.has(key)) catMap.set(key, { monto: 0, cantidad: 0, tipo: m.tipo_movimiento ?? 'EGRESO', anio });
            const entry = catMap.get(key)!;
            entry.monto += Number(m.monto ?? 0);
            entry.cantidad += 1;
        });
        const por_categoria = Array.from(catMap.entries())
            .map(([key, vals]) => {
                const [, categoria] = key.split('|');
                return { categoria, ...vals };
            })
            .sort((a, b) => b.monto - a.monto);`;

content = content.replace(porCategoriaTarget, porCategoriaReplacement);

// Fix 2: Add sortOrder to getMovimientosFiltrados
const fetchFiltradosTarget = `        const { page = 1, limit = 10, tipo, categoria, fecha_desde, fecha_hasta, search } = req.query;
        const pageNum = Number(page);
        const take = Number(limit);
        const skip = (pageNum - 1) * take;

        const where: any = { id_presupuesto: id };
        if (tipo) where.tipo_movimiento = String(tipo);
        if (categoria) where.categoria = String(categoria);
        if (search) where.descripcion = { contains: String(search), mode: 'insensitive' };
        if (fecha_desde || fecha_hasta) {
            where.fecha_movimiento = {};
            if (fecha_desde) where.fecha_movimiento.gte = new Date(String(fecha_desde));
            if (fecha_hasta) where.fecha_movimiento.lte = new Date(String(fecha_hasta) + 'T23:59:59');
        }

        const [movimientos, total] = await Promise.all([
            prismaClient.movimientos_financieros.findMany({ where, skip, take, orderBy: { fecha_movimiento: 'desc' } }),`;

const fetchFiltradosReplacement = `        const { page = 1, limit = 10, tipo, categoria, fecha_desde, fecha_hasta, search, sortOrder = 'desc' } = req.query;
        const pageNum = Number(page);
        const take = Number(limit);
        const skip = (pageNum - 1) * take;

        const where: any = { id_presupuesto: id };
        if (tipo) where.tipo_movimiento = String(tipo);
        if (categoria) where.categoria = String(categoria);
        if (search) where.descripcion = { contains: String(search), mode: 'insensitive' };
        if (fecha_desde || fecha_hasta) {
            where.fecha_movimiento = {};
            if (fecha_desde) where.fecha_movimiento.gte = new Date(String(fecha_desde));
            if (fecha_hasta) where.fecha_movimiento.lte = new Date(String(fecha_hasta) + 'T23:59:59');
        }
        
        const orderByDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

        const [movimientos, total] = await Promise.all([
            prismaClient.movimientos_financieros.findMany({ where, skip, take, orderBy: { fecha_movimiento: orderByDirection } }),`;

content = content.replace(fetchFiltradosTarget, fetchFiltradosReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched tesoreria.ts successfully!');
