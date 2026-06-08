export const statusLabels = {
  ES_RECEIVED: 'Received Letter at ES',
  DISPATCHED_TO_DEPARTMENT: 'Received Letter Dispatched',
  READY_FOR_SIGNATURE: 'Letter for sending still at ES',
  DISPATCHED: 'Letter Sent',
  ARCHIVED: 'Archived'
};

export const incomingStatusOptions = [
  { value: 'ES_RECEIVED', label: 'Received Letter at ES' },
  { value: 'DISPATCHED_TO_DEPARTMENT', label: 'Received Letter Dispatched' }
];

export const outgoingStatusOptions = [
  { value: 'READY_FOR_SIGNATURE', label: 'Letter for sending still at ES' },
  { value: 'DISPATCHED', label: 'Letter Sent' }
];

export const allStatusOptions = [
  ...incomingStatusOptions,
  ...outgoingStatusOptions.filter((status) => !incomingStatusOptions.some((item) => item.value === status.value))
];
