DELETE FROM activitats WHERE nom IN (
    'Correr en llano', 'Trail running', 'BTT', 'Bici carretera',
    'Gravel', 'Fuerza', 'Elíptica', 'Rodillo', 'Spinning',
    'Natación', 'Competición'
);

DELETE FROM entrenadors WHERE nom IN ('Marc', 'Laura') AND usuari_id IS NULL;
