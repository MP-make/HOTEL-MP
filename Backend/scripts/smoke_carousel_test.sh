#!/usr/bin/env bash
# Smoke test para endpoints del carrusel
# Uso:
# 1) Asegúrate de que el servidor esté corriendo en http://localhost:4000
# 2) Coloca una imagen de prueba en Backend/scripts/test-image.jpg si quieres probar el upload
# 3) Exporta un token de admin (JWT) en la variable TOKEN: export TOKEN="<tu_jwt>"
# 4) Ejecuta: ./Backend/scripts/smoke_carousel_test.sh

BASE="http://localhost:4000"
TOKEN="${TOKEN:-}"
TEST_IMAGE="$(dirname "$0")/test-image.jpg"

echo "== Smoke test: carrusel endpoints =="

echo
echo "1) GET público /api/carrusel"
curl -s -w "\nHTTP_STATUS:%{http_code}\n" "$BASE/api/carrusel"

if [ -z "$TOKEN" ]; then
  echo
  echo "No TOKEN proporcionado. Operaciones admin (GET/POST/DELETE) están deshabilitadas. Para probar admin, exporta TOKEN con un JWT de admin y vuelve a ejecutar."
  exit 0
fi

echo
echo "2) GET protegido /api/admin/carrusel (usa TOKEN)"
curl -s -H "Authorization: Bearer $TOKEN" -w "\nHTTP_STATUS:%{http_code}\n" "$BASE/api/admin/carrusel"

echo
echo "3) POST /api/admin/carrusel - subir imagen de prueba"
if [ ! -f "$TEST_IMAGE" ]; then
  echo "Imagen de prueba no encontrada en: $TEST_IMAGE"
  echo "Coloca un archivo (jpg/png) en esa ruta para probar el upload. Se omitirá el POST."
else
  # Realizar upload
  RES_UPLOAD=$(curl -s -H "Authorization: Bearer $TOKEN" -F "image=@$TEST_IMAGE" "$BASE/api/admin/carrusel")
  echo "Respuesta upload: $RES_UPLOAD"

  # Intentar extraer el nombre de archivo devuelto (si devuelve { image: "/img/carousel/<name>" })
  UPLOADED_PATH=$(echo "$RES_UPLOAD" | sed -n 's/.*\"image\":\s*\"\([^\"]*\)\".*/\1/p')
  if [ -n "$UPLOADED_PATH" ]; then
    UPLOADED_NAME=$(basename "$UPLOADED_PATH")
    echo "Archivo subido: $UPLOADED_PATH (nombre: $UPLOADED_NAME)"

    echo
    echo "4) DELETE /api/admin/carrusel/:name -> eliminar $UPLOADED_NAME"
    curl -s -X DELETE -H "Authorization: Bearer $TOKEN" -w "\nHTTP_STATUS:%{http_code}\n" "$BASE/api/admin/carrusel/$UPLOADED_NAME"
  else
    echo "No se pudo determinar la ruta del archivo subido a partir de la respuesta. Revisa el output anterior." 
  fi
fi

echo
echo "== Fin de prueba =="
