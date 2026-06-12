ALTER TABLE usuaris DROP CONSTRAINT usuaris_rol_check;
ALTER TABLE usuaris ADD CONSTRAINT usuaris_rol_check CHECK (rol IN ('atleta', 'entrenador', 'admin'));

-- Elevate ezapaterm@gmail.com to admin
UPDATE usuaris SET rol = 'admin' WHERE email = 'ezapaterm@gmail.com';
