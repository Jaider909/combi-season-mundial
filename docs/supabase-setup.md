# Conectar Supabase

## 1. Crear tablas

En Supabase ve a **SQL Editor** y ejecuta el contenido de:

`supabase/schema.sql`

Eso crea:

- `players`
- `matches`
- `predictions`

Tambien activa politicas publicas temporales para que el formulario pueda crear
registros desde la web.

## 2. Copiar claves publicas

En Supabase ve a **Configuracion > Claves API**.

Copia:

- `Project URL`
- `anon public`

No uses ni compartas la `service_role key` en el frontend.

## 3. Pegar claves en el proyecto

Abre:

`js/config/supabase-config.js`

Y completa:

```js
export const supabaseConfig = {
  url: "https://anetzkhbkfhmtwcslnzk.supabase.co",
  anonKey: "TU_ANON_PUBLIC_KEY",
};
```

Cuando esos valores esten completos, la app cambia automaticamente a modo nube.

## 4. Probar

Abre la pagina, registra un usuario y revisa en Supabase:

**Table Editor > players**

Debe aparecer el registro.

## 5. Auth

El registro ya esta preparado para usar email y contrasena con Supabase Auth.

En Supabase revisa:

**Authentication > Providers > Email**

Decide si quieres:

- Confirmar email antes de permitir login.
- Entrar inmediatamente despues del registro.

Para pruebas rapidas puedes desactivar confirmacion de email. Para produccion es
mejor dejar confirmacion activa.

## 6. Administrador

El correo administrador inicial esta en:

`js/config/admins.js`

Actualmente:

`jaimoro909@hotmail.com`

Ese usuario queda con `role = 'admin'`, pero tambien puede jugar porque sigue
registrado en `players`.
