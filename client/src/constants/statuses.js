export const statusLabels = {
  ES_RECEIVED: 'Pending internal dispatch',
  DISPATCHED_TO_DEPARTMENT: 'Dispatched internally',
  READY_FOR_SIGNATURE: 'Pending external dispatch',
  DISPATCHED: 'Dispatched externally',
  ARCHIVED: 'Archived'
};

export const incomingStatusOptions = [
  { value: 'ES_RECEIVED', label: 'Pending internal dispatch' },
  { value: 'DISPATCHED_TO_DEPARTMENT', label: 'Dispatched internally' }
];

export const outgoingStatusOptions = [
  { value: 'READY_FOR_SIGNATURE', label: 'Pending external dispatch' },
  { value: 'DISPATCHED', label: 'Dispatched externally' }
];

export const allStatusOptions = [
  ...incomingStatusOptions,
  ...outgoingStatusOptions.filter((status) => !incomingStatusOptions.some((item) => item.value === status.value))
];
