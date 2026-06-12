-- Downgrade ezapaterm@gmail.com to entrenador
UPDATE usuaris SET rol = 'entrenador' WHERE email = 'ezapaterm@gmail.com';

-- Any other admin should also be downgraded, otherwise the constraint will fail.
UPDATE usuaris SET rol = 'entrenador' WHERE rol = 'admin';

ALTER TABLE usuaris DROP CONSTRAINT usuaris_rol_check;
ALTER TABLE usuaris ADD CONSTRAINT usuaris_rol_check CHECK (rol IN ('atleta', 'entrenador'));
