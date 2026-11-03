import { PLACE_CATEGORY } from '@aporta/shared'
import type { Place } from '@aporta/shared'

/**
 * The city guide, copied from `frontend/src/lib/data/places.ts` (the backend never imports from
 * the frontend: the two copies are kept equal by hand until the frontend reads the API).
 *
 * ATTENTION, this is sample content: the names are generic and the phone numbers are fictional
 * (prefix `5597999990`), on purpose, so a seeded database never sends anyone to a real number.
 * The real curation is by people from the city and goes in through the panel. `neighborhood` is
 * the `slug` of a neighborhood in `neighborhoods.ts`; the seeder resolves it to the key.
 */
export const PLACES: ReadonlyArray<Place> = [
  {
    id: 'plc-001',
    category: PLACE_CATEGORY.EAT,
    name: 'Peixaria do Porto',
    description:
      'Tambaqui, pirarucu e jaraqui na brasa, com prato feito no almoço.',
    neighborhood: 'centro',
    address: 'Rua do Porto, perto da balsa',
    hours: 'Seg a sáb, 11h às 15h',
    whatsapp: '5597999990001',
    date: null,
  },
  {
    id: 'plc-002',
    category: PLACE_CATEGORY.EAT,
    name: 'Cantina do Campus',
    description:
      'Lanche, suco de cupuaçu e marmita barata para quem estuda na UFAM.',
    neighborhood: 'colonia-1',
    address: 'Em frente ao campus',
    hours: 'Seg a sex, 7h às 19h',
    whatsapp: '5597999990002',
    date: null,
  },
  {
    id: 'plc-003',
    category: PLACE_CATEGORY.EAT,
    name: 'Tacacá da Praça',
    description: 'Tacacá quente no fim da tarde, como manda a tradição.',
    neighborhood: 'centro',
    address: 'Praça central',
    hours: 'Todos os dias, 16h às 21h',
    whatsapp: null,
    date: null,
  },
  {
    id: 'plc-004',
    category: PLACE_CATEGORY.DRINK,
    name: 'Bar do Beiradão',
    description:
      'Cerveja gelada e petisco à beira do rio, com vista do pôr do sol.',
    neighborhood: 'centro',
    address: 'Orla, ao lado do porto',
    hours: 'Qui a dom, 17h às 23h',
    whatsapp: '5597999990003',
    date: null,
  },
  {
    id: 'plc-005',
    category: PLACE_CATEGORY.DRINK,
    name: 'Choperia da Cidade Nova',
    description:
      'Chope, música ao vivo nos fins de semana e mesa grande para a turma.',
    neighborhood: 'cidade-nova',
    address: 'Avenida principal do bairro',
    hours: 'Sex e sáb, 18h à 1h',
    whatsapp: '5597999990004',
    date: null,
  },
  {
    id: 'plc-006',
    category: PLACE_CATEGORY.EVENT,
    name: 'Festival dos Bois-Bumbás',
    description:
      'A cidade se divide entre os dois bois, com toadas, alegorias e arquibancada cheia.',
    neighborhood: 'cohabam',
    address: 'Arena do festival',
    hours: 'Noites do festival, a partir das 19h',
    whatsapp: null,
    date: '2027-06-26',
  },
  {
    id: 'plc-007',
    category: PLACE_CATEGORY.EVENT,
    name: 'Recepção dos calouros',
    description:
      'Encontro de boas-vindas com feira de moradia e roda de conversa com veteranos.',
    neighborhood: 'colonia-1',
    address: 'Auditório do campus',
    hours: 'Manhã de sábado',
    whatsapp: null,
    date: '2027-03-06',
  },
  {
    id: 'plc-008',
    category: PLACE_CATEGORY.SERVICE,
    name: 'Agência bancária central',
    description:
      'Caixa eletrônico e atendimento. Leve documento e evite o dia de pagamento.',
    neighborhood: 'centro',
    address: 'Rua principal, no centro',
    hours: 'Seg a sex, 9h às 15h',
    whatsapp: null,
    date: null,
  },
  {
    id: 'plc-009',
    category: PLACE_CATEGORY.SERVICE,
    name: 'Farmácia da Praça',
    description:
      'Medicamentos e atendimento até a noite, com entrega nos bairros próximos.',
    neighborhood: 'centro',
    address: 'Perto da praça central',
    hours: 'Todos os dias, 7h às 22h',
    whatsapp: '5597999990005',
    date: null,
  },
  {
    id: 'plc-010',
    category: PLACE_CATEGORY.SERVICE,
    name: 'Porto e embarque de lanchas',
    description:
      'Saída para Tabatinga e Atalaia do Norte, com horários que mudam com a vazante.',
    neighborhood: 'centro',
    address: 'Porto da cidade',
    hours: 'Confirme o horário no dia',
    whatsapp: '5597999990006',
    date: null,
  },
]
