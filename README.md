# Editorial Acuario — base técnica

Esta carpeta contiene la base de datos para convertir la maqueta de Editorial Acuario en una plataforma editorial real con Supabase.

## Funcionalidades previstas

- Autores y perfiles públicos.
- Novelas con estado de revisión: borrador, pendiente, aprobada, rechazada y publicada.
- Comentarios moderables.
- Reacciones de me gusta y no me gusta.
- Valoraciones de 1 a 5 estrellas.
- Conteo de lecturas.
- Catálogo editorial para obras seleccionadas.
- Libros digitales y libros bajo demanda con precio y estado de venta.
- Donaciones o apoyos a autores mediante un proveedor de pagos externo.

## Cómo usarlo

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor** y ejecuta `supabase/schema.sql`.
3. En Authentication activa email/password y configura las URLs de tu aplicación.
4. Crea los buckets `covers` y `manuscripts` en Storage. El bucket `manuscripts` debe ser privado.
5. Configura el frontend con las variables de `.env.example`.

La pantalla actual de `index.html` es una demo estática. Para activar usuarios, archivos, pagos y moderación habrá que conectar una aplicación frontend/backend a estas tablas y a un proveedor de pagos. No pongas claves secretas en el navegador.

## Modelo editorial recomendado

Una obra no se vende automáticamente por recibir buenas reacciones. El comité editorial puede usar lecturas, valoración, comentarios y calidad del manuscrito como señales, pero la aceptación final debe quedar registrada y acompañada por un contrato claro sobre derechos, duración, territorio, regalías, precios y retirada de la obra.
