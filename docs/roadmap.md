# Modelo editorial y plan de producto

## Cómo lo veo

La propuesta es buena y tiene sentido como mini editorial: la comunidad puede descubrir obras, dar retroalimentación y ayudar a detectar historias con potencial. Las reacciones y las valoraciones deben ser **señales**, no el único criterio de publicación: también conviene evaluar calidad, originalidad, corrección, derechos de autor y encaje editorial.

## Secciones del producto

1. **Descubrir**: catálogo público, búsqueda, géneros y páginas individuales.
2. **Comunidad**: comentarios moderables, me gusta/no me gusta, estrellas y lecturas.
3. **Autores**: registro, perfil, panel privado, manuscritos y estado de revisión.
4. **Selección editorial**: obras destacadas que hayan pasado revisión.
5. **Tienda**: EPUB y bajo demanda, con precios y disponibilidad.
6. **Apoyar**: donaciones procesadas por un proveedor externo, con comprobantes y estados.
7. **Administración**: moderación, revisión editorial, reportes y métricas.

## Importante antes de vender o aceptar donaciones

- La venta y las donaciones necesitan un proveedor de pagos y webhooks en un servidor.
- Los contratos deben explicar derechos cedidos, duración, territorios, exclusividad, regalías, gastos, precios, impresión bajo demanda y terminación.
- Conviene revisar contratos, fiscalidad, protección de datos, moderación y derechos de autor con un profesional del país donde operará la editorial.
- Nunca guardes datos de tarjetas ni claves privadas en el frontend.

## Próxima implementación técnica

1. Crear el proyecto Next.js y conectar Supabase.
2. Implementar Auth, perfil y dashboard del autor.
3. Añadir subida privada de manuscritos y portadas.
4. Construir catálogo desde `novels` y `novel_metrics`.
5. Añadir comentarios, reacciones y valoraciones con RLS.
6. Crear revisión editorial y selección de obras.
7. Integrar tienda y apoyos con Stripe Checkout + webhooks.
