export const COMPONENT_IDS = [
  'screen',
  'payment_terminal',
  'rfid_reader',
  'buttons',
  'emergency_stop',
  'cable',
  'connector',
  'holster',
  'cable_management',
  'socket',
  'bollards',
  'kerb',
  'bay_surface',
  'bay_space',
  'signage',
  'lighting',
] as const;

export type ComponentId = (typeof COMPONENT_IDS)[number];

export type Pas1899Area =
  | 'Chargepoint component heights'
  | 'Cable weight and cable management'
  | 'Connector grip and force'
  | 'Screen content and visibility'
  | 'Information and signage'
  | 'Bay and surroundings';

export interface ComponentInfo {
  id: ComponentId;
  label: string;
  alsoCalled: string[];
  description: string;
  pas1899Area: Pas1899Area[];
}

export const TAXONOMY: Record<ComponentId, ComponentInfo> = {
  screen: {
    id: 'screen',
    label: 'Screen',
    alsoCalled: ['display', 'monitor'],
    description: 'The display that shows instructions and charging progress.',
    pas1899Area: ['Screen content and visibility', 'Chargepoint component heights'],
  },
  payment_terminal: {
    id: 'payment_terminal',
    label: 'Card reader',
    alsoCalled: ['contactless', 'payment machine'],
    description: 'Where you pay by bank card or phone.',
    pas1899Area: ['Chargepoint component heights', 'Screen content and visibility'],
  },
  rfid_reader: {
    id: 'rfid_reader',
    label: 'Card tap pad',
    alsoCalled: ['RFID', 'Go Charge card reader'],
    description: 'The pad you tap your Go Charge card or app on to start.',
    pas1899Area: ['Chargepoint component heights'],
  },
  buttons: {
    id: 'buttons',
    label: 'Buttons',
    alsoCalled: ['start', 'stop', 'controls'],
    description: 'The start and stop buttons on the front of the charger.',
    pas1899Area: ['Chargepoint component heights', 'Connector grip and force'],
  },
  emergency_stop: {
    id: 'emergency_stop',
    label: 'Emergency stop',
    alsoCalled: ['red button'],
    description: 'The red button that cuts the power in an emergency.',
    pas1899Area: ['Chargepoint component heights'],
  },
  cable: {
    id: 'cable',
    label: 'Charging cable',
    alsoCalled: ['lead', 'wire'],
    description: 'The thick cable that runs from the charger to the plug.',
    pas1899Area: ['Cable weight and cable management'],
  },
  connector: {
    id: 'connector',
    label: 'Plug',
    alsoCalled: ['connector', 'nozzle', 'CCS', 'Type 2'],
    description: 'The handle you hold and push into the car.',
    pas1899Area: ['Connector grip and force'],
  },
  holster: {
    id: 'holster',
    label: 'Cable holster',
    alsoCalled: ['plug holder', 'dock'],
    description: 'The holder on the side of the charger where the plug is kept.',
    pas1899Area: ['Chargepoint component heights', 'Connector grip and force'],
  },
  cable_management: {
    id: 'cable_management',
    label: 'Cable support arm',
    alsoCalled: ['retractor', 'overhead arm'],
    description: 'The arm above the charger that takes some of the cable weight.',
    pas1899Area: ['Cable weight and cable management'],
  },
  socket: {
    id: 'socket',
    label: 'Socket',
    alsoCalled: ['outlet'],
    description: 'A socket where you plug in your own cable.',
    pas1899Area: ['Chargepoint component heights', 'Connector grip and force'],
  },
  bollards: {
    id: 'bollards',
    label: 'Bollards',
    alsoCalled: ['posts', 'barriers'],
    description: 'The short posts that protect the charger from cars.',
    pas1899Area: ['Bay and surroundings'],
  },
  kerb: {
    id: 'kerb',
    label: 'Kerb',
    alsoCalled: ['step', 'dropped kerb'],
    description: 'The raised edge between the bay and the charger.',
    pas1899Area: ['Bay and surroundings'],
  },
  bay_surface: {
    id: 'bay_surface',
    label: 'Ground surface',
    alsoCalled: ['bay', 'slope', 'gravel'],
    description: 'The ground in the parking bay, including any slope.',
    pas1899Area: ['Bay and surroundings'],
  },
  bay_space: {
    id: 'bay_space',
    label: 'Space around the car',
    alsoCalled: ['bay width', 'room to open doors'],
    description: 'The room beside the car to open doors and move around.',
    pas1899Area: ['Bay and surroundings'],
  },
  signage: {
    id: 'signage',
    label: 'Signs and labels',
    alsoCalled: ['instructions', 'stickers'],
    description: 'Signs, labels and printed instructions on or near the charger.',
    pas1899Area: ['Information and signage'],
  },
  lighting: {
    id: 'lighting',
    label: 'Lighting',
    alsoCalled: ['dark', 'lights'],
    description: 'The lights over the charger and the bay.',
    pas1899Area: ['Screen content and visibility', 'Bay and surroundings'],
  },
};

export const componentLabel = (id: ComponentId) => TAXONOMY[id].label;
