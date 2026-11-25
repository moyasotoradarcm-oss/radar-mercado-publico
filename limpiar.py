import pandas as pd
import os
import re

archivos = [f for f in os.listdir('.') if f.endswith('.xlsx')]
if not archivos:
    print("❌ No se encontró ningún archivo .xlsx en esta carpeta.")
    exit()

archivo_origen = archivos[0]
print(f"📄 Procesando archivo: {archivo_origen}...")

df = pd.read_excel(archivo_origen)

# 1. Eliminar columnas redundantes
cols_eliminar = ['Nombre Completo (2)', 'E-Mail Usuario (2)', 'Fono Usuario (2)', 'Fax']
df = df.drop(columns=[c for c in cols_eliminar if c in df.columns])

# 2. Limpiar y convertir columnas de números (quitar decimales innecesarios .0)
cols_numericas = ['Total Neto', 'Descuento', 'IVA 19%', 'TOTAL OC', 'NETO USD', 'NETO CLP']
for col in cols_numericas:
    if col in df.columns:
        df[col] = df[col].astype(str).str.replace('UF', '', regex=False).str.replace(' ', '', regex=False).str.replace(',', '.', regex=False)
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).round(2)

# 3. Normalizar nombres de columnas a snake_case
def normalizar_columna(col):
    col = col.lower()
    col = col.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
    col = col.replace('%', 'pct').replace('.', '')
    col = re.sub(r'[^a-z0-9_]', '_', col)
    col = re.sub(r'_+', '_', col).strip('_')
    return col

df.columns = [normalizar_columna(c) for c in df.columns]

# 4. Limpiar textos: Quitar comillas dobles, saltos de línea y rellenar vacíos (NULOS)
cols_texto = df.select_dtypes(include=['object']).columns
for col in cols_texto:
    # Quitar comillas dobles y saltos de línea que rompen el CSV
    df[col] = df[col].astype(str).str.replace('"', '', regex=False).str.replace('\n', ' ', regex=False).str.replace('\r', ' ', regex=False).str.strip()
    # Reemplazar 'nan' o vacíos por un valor por defecto seguro
    df[col] = df[col].replace(['nan', 'NaN', 'None', ''], 'Sin informacion')

# 5. Guardar CSV 100% compatible
df.to_csv('Mercado_Publico_Limpio.csv', index=False, sep=',', encoding='utf-8')
df.to_excel('Mercado_Publico_Limpio.xlsx', index=False)

print("✅ ¡Limpieza ultra-robusta completada!")
print("- Comillas dobles y saltos de línea eliminados.")
print("- Valores nulos/vacíos reemplazados por 'Sin informacion'.")
print("- Formato CSV listo para importar en Supabase/PostgreSQL.")
