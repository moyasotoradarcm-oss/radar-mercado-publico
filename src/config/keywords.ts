export const KEYWORD_CLUSTERS = {
  TECNOLOGIA_TI: {
    label: 'Tecnología TI',
    terms: [
      { term: 'desarrollo', weight: 4 },
      { term: 'software', weight: 5 },
      { term: 'microservicios', weight: 4 },
      { term: 'api', weight: 3 },
      { term: 'ui ux', weight: 3 },
      { term: 'soporte de sistemas', weight: 4 },
      { term: 'selico', weight: 3 }
    ]
  },
  LICENCIAMIENTO_SOFTWARE: {
    label: 'Licenciamiento',
    terms: [
      { term: 'licencia de software', weight: 5 },
      { term: 'licenciamiento', weight: 5 },
      { term: 'saas', weight: 4 },
      { term: 'google workspace', weight: 4 },
      { term: 'workspace', weight: 3 },
      { term: 'gemini', weight: 4 },
      { term: 'ai first', weight: 3 }
    ]
  },
  INFRAESTRUCTURA: {
    label: 'Infraestructura y Cloud',
    terms: [
      { term: 'gcp', weight: 5 },
      { term: 'google cloud', weight: 5 },
      { term: 'aws', weight: 5 },
      { term: 'azure', weight: 5 },
      { term: 'cloud', weight: 4 },
      { term: 'nube', weight: 3 },
      { term: 'secops', weight: 4 }
    ]
  },
  GEOLOCALIZACION: {
    label: 'GIS y Geolocalización',
    terms: [
      { term: 'google maps', weight: 5 },
      { term: 'maps api', weight: 5 },
      { term: 'geolocalizacion', weight: 4 },
      { term: 'gis', weight: 4 },
      { term: 'visor territorial', weight: 5 },
      { term: 'visor geografico', weight: 5 },
      { term: 'creditos google', weight: 4 },
      { term: 'comisaria virtual', weight: 4 }
    ]
  },
  SERVICIOS_PROFESIONALES: {
    label: 'Servicios profesionales',
    terms: [
      { term: 'mantencion evolutiva', weight: 4 },
      { term: 'consultoria', weight: 3 },
      { term: 'implementacion', weight: 3 },
      { term: 'soporte especializado', weight: 3 }
    ]
  },
  DATOS_BI_ANALITICA: {
    label: 'Datos y Analítica',
    terms: [
      { term: 'bi', weight: 3 },
      { term: 'power bi', weight: 5 },
      { term: 'qlik', weight: 4 },
      { term: 'qlik sense', weight: 5 },
      { term: 'etl', weight: 4 },
      { term: 'gobernanza de datos', weight: 5 },
      { term: 'migracion de datos', weight: 4 },
      { term: 'datos', weight: 2 },
      { term: 'dashboard', weight: 3 }
    ]
  },
  GESTION_DOCUMENTAL: {
    label: 'Gestión documental y firma',
    terms: [
      { term: 'gestor documental', weight: 5 },
      { term: 'gestion documental', weight: 5 },
      { term: 'bpm', weight: 4 },
      { term: 'firma digital', weight: 5 },
      { term: 'digitalizacion', weight: 3 }
    ]
  }
} as const;

export type KeywordClusterKey = keyof typeof KEYWORD_CLUSTERS;

export const SET_PALABRAS_CLAVE_MASTER: string[] = Object.values(KEYWORD_CLUSTERS)
  .flatMap((cluster) => cluster.terms.map(({ term }) => term));

export const SET_PALABRAS_CLAVE = SET_PALABRAS_CLAVE_MASTER;
