# Resultados del Benchmark: MergeSort vs QuickSort

Pruebas con `performance.now()`, promedio de 5 repeticiones por caso.

| Registros | Escenario | MergeSort Tiempo (ms) | MergeSort Memoria (KB) | QuickSort Tiempo (ms) | QuickSort Memoria (KB) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 1.000 | aleatorios | 0.5797 | 44.54 | 0.8075 | 109.13 |
| 1.000 | ya ordenados | 0.3299 | 18.06 | 1.1053 | 111.57 |
| 1.000 | invertidos | 0.2831 | 17.67 | 0.9184 | 36.61 |
| 10.000 | aleatorios | 8.6322 | 174.80 | 10.9029 | 286.12 |
| 10.000 | ya ordenados | 4.5548 | 161.30 | 30.0399 | 362.37 |
| 10.000 | invertidos | 4.9900 | 159.76 | 23.2631 | 361.92 |
| 100.000 | aleatorios | 175.7367 | 1566.91 | 233.0717 | 3573.05 |
| 100.000 | ya ordenados | 97.5698 | 1250.41 | 942.5465 | 3612.38 |
| 100.000 | invertidos | 100.6947 | 1563.02 | 755.4314 | 2891.10 |

## Conclusión

De los 9 casos medidos, QuickSort fue más rápido en 0 y MergeSort en 9. MergeSort mantiene O(n log n) en cualquier orden de entrada y es estable, mientras que QuickSort ordena en el mismo arreglo (menos memoria) pero puede degradarse a O(n²) si el pivote es malo. Revisar la tabla para ver en qué escenarios cambia el resultado.
