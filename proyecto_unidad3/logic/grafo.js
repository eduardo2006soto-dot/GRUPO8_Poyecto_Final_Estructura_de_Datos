// grafo.js — Estructura de datos Grafo + Haversine + Dijkstra + Búsqueda de Nodo Cercano

class Grafo {
    constructor() {
        this.nodos = new Map(); // Usamos Map para mejor rendimiento y compatibilidad
    }

    agregarNodo(id, lat, lng) {
        this.nodos.set(id, {
            lat: lat,
            lng: lng,
            vecinos: new Map()
        });
    }

    agregarArista(idOrigen, idDestino, distancia) {
        const nodoOrigen = this.nodos.get(idOrigen);
        const nodoDestino = this.nodos.get(idDestino);
        if (nodoOrigen && nodoDestino) {
            nodoOrigen.vecinos.set(idDestino, distancia);
            nodoDestino.vecinos.set(idOrigen, distancia);
        }
    }

    // Método para encontrar el nodo más cercano basado en coordenadas (lat, lng)
    nodoMasCercano(latTarget, lngTarget) {
        let masCercano = null;
        let menorDistancia = Infinity;

        for (const [id, nodo] of this.nodos.entries()) {
            const d = calcularDistancia(latTarget, lngTarget, nodo.lat, nodo.lng);
            if (d < menorDistancia) {
                menorDistancia = d;
                masCercano = id;
            }
        }
        return masCercano;
    }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const radioTierra = 6371000;
    const f1 = lat1 * Math.PI / 180;
    const f2 = lat2 * Math.PI / 180;
    const deltaF = (lat2 - lat1) * Math.PI / 180;
    const deltaL = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaF/2) * Math.sin(deltaF/2) +
              Math.cos(f1) * Math.cos(f2) *
              Math.sin(deltaL/2) * Math.sin(deltaL/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return radioTierra * c;
}

class ColaPrioridad {
    constructor() {
        this.elementos = [];
    }

    encolar(elemento, prioridad) {
        this.elementos.push({elemento, prioridad});
        this.elementos.sort((a, b) => a.prioridad - b.prioridad);
    }

    desencolar() {
        return this.elementos.shift().elemento;
    }

    estaVacia() {
        return this.elementos.length === 0;
    }
}

// ==========================================
// DIJKSTRA (Con protección contra nodos indefinidos)
// ==========================================
function ejecutarDijkstra(grafo, nodoInicio, destino = null) {
    if (!nodoInicio || !grafo.nodos.has(nodoInicio)) {
        console.warn(`Advertencia: Nodo de inicio no válido o indefinido (${nodoInicio}).`);
        return { distancias: new Map(), previos: new Map() };
    }

    const distancias = new Map();
    const previos = new Map();
    for (const id of grafo.nodos.keys()) {
        distancias.set(id, Infinity);
        previos.set(id, null);
    }

    distancias.set(nodoInicio, 0);
    const cola = new ColaPrioridad();
    cola.encolar(nodoInicio, 0);

    while (!cola.estaVacia()) {
        const { elemento: actual, prioridad: distActual } = cola.desencolar();

        if (distActual > distancias.get(actual)) continue;
        if (actual === destino) break;

        const nodoActualObj = grafo.nodos.get(actual);
        if (!nodoActualObj) continue;

        for (const [vecino, pesoCalle] of nodoActualObj.vecinos.entries()) {
            const candidata = distActual + pesoCalle;
            if (candidata < distancias.get(vecino)) {
                distancias.set(vecino, candidata);
                previos.set(vecino, actual);
                cola.encolar(vecino, candidata);
            }
        }
    }

    return { distancias, previos };
}

function reconstruirRuta(previos, inicio, destino) {
    const camino = [];
    let actual = destino;
    while (actual !== null && actual !== undefined) {
        camino.push(actual);
        if (actual === inicio) return camino.reverse();
        actual = previos.get(actual);
    }
    return null;
}

// ==========================================
// UNION-FIND
// ==========================================
class UnionFind {
    constructor(n) {
        this.padre = Array.from({ length: n }, (_, i) => i);
    }

    buscar(x) {
        while (this.padre[x] !== x) {
            this.padre[x] = this.padre[this.padre[x]];
            x = this.padre[x];
        }
        return x;
    }

    unir(a, b) {
        const ra = this.buscar(a);
        const rb = this.buscar(b);
        if (ra === rb) return false;
        this.padre[ra] = rb;
        return true;
    }
}

// ==========================================
// RED VIAL
// ==========================================
function construirRedVial(sectores, umbralCruce = 30) {
    const grafo = new Grafo();
    const ids = [];

    sectores.forEach(function(sector, s) {
        sector.ruta.forEach(function(punto, i) {
            const id = `${s}:${i}`;
            grafo.agregarNodo(id, punto[0], punto[1]);
            ids.push(id);
        });
    });

    sectores.forEach(function(sector, s) {
        for (let i = 1; i < sector.ruta.length; i++) {
            const idOrigen = `${s}:${i - 1}`;
            const idDestino = `${s}:${i}`;
            const nodo1 = grafo.nodos.get(idOrigen);
            const nodo2 = grafo.nodos.get(idDestino);
            if (nodo1 && nodo2) {
                const d = calcularDistancia(nodo1.lat, nodo1.lng, nodo2.lat, nodo2.lng);
                grafo.agregarArista(idOrigen, idDestino, d);
            }
        }
    });

    const n = ids.length;
    const indice = new Map(ids.map((id, i) => [id, i]));
    const nodos = ids.map(id => grafo.nodos.get(id));
    const grados = umbralCruce / 111000;
    const uf = new UnionFind(n);

    for (const [id, nodo] of grafo.nodos.entries()) {
        for (const vecino of nodo.vecinos.keys()) {
            uf.unir(indice.get(id), indice.get(vecino));
        }
    }

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(nodos[i].lat - nodos[j].lat) > grados) continue;
            const d = calcularDistancia(nodos[i].lat, nodos[i].lng, nodos[j].lat, nodos[j].lng);
            if (d <= umbralCruce) {
                grafo.agregarArista(ids[i], ids[j], d);
                uf.unir(i, j);
            }
        }
    }

    grafo.puentes = [];
    let componentes = new Set(ids.map((_, i) => uf.buscar(i))).size;
    while (componentes > 1) {
        let mejor = null;
        for (let i = 0; i < n; i++) {
            const ri = uf.buscar(i);
            for (let j = i + 1; j < n; j++) {
                if (uf.buscar(j) === ri) continue;
                const d = calcularDistancia(nodos[i].lat, nodos[i].lng, nodos[j].lat, nodos[j].lng);
                if (mejor === null || d < mejor.d) mejor = { i, j, d };
            }
        }
        if (mejor === null) break;
        grafo.agregarArista(ids[mejor.i], ids[mejor.j], mejor.d);
        grafo.puentes.push({ desde: ids[mejor.i], hasta: ids[mejor.j], distancia: mejor.d });
        uf.unir(mejor.i, mejor.j);
        componentes--;
    }

    return grafo;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcularDistancia, Grafo, ColaPrioridad, ejecutarDijkstra,
        reconstruirRuta, UnionFind, construirRedVial
    };
}