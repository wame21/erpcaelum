# Caelum Jewelry Showcase

toma como inspiracion ese tipo de diseño para la pagina, en contexto, mi pagina sera para dar a conocermi inventario de joyeria llamada Caelum, te adjunto mi logo, como podras darte cuenta la pagina principal tendra un encabezado, el cual sera el mismo para todas las paginas que llegues a crear (excepto para el admin, que hablaremos mas adelante de eso), tambien tendra un footer, ahora los datos de las piezas de joyeria la tomaras de Supabase, lo cual tendras que crear un backend solido y seguro para hacer peticiones a mi BD para consultar inventario.

Crea una landing page responsiva (mobile-first) para una marca de joyería de autor y lujo minimalista llamada CAELUM. Utiliza la imagen adjunta como referencia exacta de diseño y maquetación.

Detalles clave:

Estética: Fondo negro profundo / oscuro mate, textos en blanco puro y tonos gris plomo, botones elegantes sin bordes pesados.

Header: Logo de CAELUM centrado con la leyenda 'Silentium est potentia'.

Hero Section: Cuadrícula de 2 columnas mostrando imágenes destacadas de uso de joyería.

Banner de Marca: Bloque destacado con el texto: 'El lujo real se lleva en silencio. Piezas atemporales de plata .925 que imponen respeto sin decir una sola palabra.'

Sección de Categorías: Tarjetas interactivas para 'Cadenas' y 'Pulsos'.

Footer: Fondo negro con textos de autenticidad ('Auténtica Plata Sólida .925'), cobertura ('Entregas personales en Guasave, Sin. Envíos seguros a todo México') y el eslogan final.*

Asegúrate de incluir efectos hover sutiles en los botones y transiciones suaves al hacer scroll.

para el apartado del Backend, toma supabase y crea una tabla de productos, donde en esa tabla tengas codigo_proveedor (el cual se utilizara ya que mi proveedor maneja por codigos para darme precios por gramo de plata, por ejemplo el PNM09 me lo da a 58 pesos el gramo y el PNM16 a 70 pesos el gramo, esto lo utilizare para multiplicar por el peso de la joya para obtener el precio final de venta, aun que yo estandarizare los precios del PNM06 a 98 pesos por gramo y para el PNM16 a 110 pesos, quiero tener el contro)tambien tendras campos para poder registrar la medida de la joya, el grosor, el peso de la joya, tambien configuraremos un buckeet en supabase para poder subir imagenes de cada pieza de joyeria para que puedas agregarla a la pagina. el bucket lo llame caelum_imagenes

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://caelumjoyeria.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f7a28b35-147d-4664-8446-d95e9d881bd4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
