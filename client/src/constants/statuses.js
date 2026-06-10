// Two statuses only:
//  RECEIVED  = received by the commission (every incoming letter)
//  DISPATCHED = sent from the commission (every outgoing letter)
export const statusLabels = {
  RECEIVED: 'Received',
  DISPATCHED: 'Dispatched'
};

export const incomingStatusOptions = [
  { value: 'RECEIVED', label: 'Received' }
];

export const outgoingStatusOptions = [
  { value: 'DISPATCHED', label: 'Dispatched' }
];

export const allStatusOptions = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'DISPATCHED', label: 'Dispatched' }
];
