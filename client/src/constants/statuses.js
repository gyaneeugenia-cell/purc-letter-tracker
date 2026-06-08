export const statusLabels = {
  ES_RECEIVED: 'Received Letters at ES',
  DISPATCHED_TO_DEPARTMENT: 'Received Letters Dispatched',
  READY_FOR_SIGNATURE: 'Letters for sending still at ES',
  DISPATCHED: 'Letters Sent',
  ARCHIVED: 'Archived'
};

export const incomingStatusOptions = [
  { value: 'ES_RECEIVED', label: 'Received Letters at ES' },
  { value: 'DISPATCHED_TO_DEPARTMENT', label: 'Received Letters Dispatched' }
];

export const outgoingStatusOptions = [
  { value: 'READY_FOR_SIGNATURE', label: 'Letters for sending still at ES' },
  { value: 'DISPATCHED', label: 'Letters Sent' }
];

export const allStatusOptions = [
  ...incomingStatusOptions,
  ...outgoingStatusOptions.filter((status) => !incomingStatusOptions.some((item) => item.value === status.value))
];
