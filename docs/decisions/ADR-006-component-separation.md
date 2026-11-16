# ADR-006 — Separación de componentes y hooks (2026-11-16)

**Estado:** Adoptada.

**Contexto:** El componente `BocaApp.tsx` original contenía ~180 líneas comprimidas en una sola línea, mezclando:
- Tipos TypeScript
- Constantes y configuración
- Lógica de negocio
- Componentes inline
- Estado y efectos

Esto hacía imposible:
- Testear funciones individuales
- Reutilizar lógica en otros contextos
- Mantener el código de forma legible
- Encontrar errores rápidamente

**Decisión:** Separar en una estructura modular:

```
app/
├── types/           # Tipos del dominio
├── constants/       # Constantes y configuración
├── utils/           # Funciones puras sin estado
├── hooks/           # Hooks personalizados de React
├── components/      # Componentes reutilizables
├── pages/           # Vistas completas
└── BocaApp.tsx      # Solo coordinación
```

Principios aplicados:
1. **Single Responsibility:** Cada archivo tiene un propósito único
2. **Dependency Injection:** Hooks reciben dependencias como parámetros
3. **Pure Functions:** Utils no tienen efectos secundarios
4. **Composition:** Páginas componen componentes, no heredan

**Consecuencias:**
- Aumenta el número de archivos, pero cada uno es comprensible
- Los tests pueden importar funciones individuales
- Los cambios son locales, no se propaga el caos
- El bundle splitting puede optimizarse por página

**Alternativas consideradas:**
- Mantener monolito: imposible de mantener a largo plazo
- Usar state manager global (Zustand/Redux): innecesario para el scope actual
- Migrar a Next.js App Router completo: requerido por el framework Vinext
