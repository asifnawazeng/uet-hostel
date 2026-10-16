import type {
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

export interface RoomCapacityMetrics {
  totalCapacity: number;
  occupiedBeds: number;
}

export function calculateRoomCapacityMetrics(
  rooms: readonly QueryDocumentSnapshot<DocumentData>[]
): RoomCapacityMetrics {
  return rooms.reduce<RoomCapacityMetrics>(
    (metrics, roomDocument) => {
      const room = roomDocument.data();
      metrics.totalCapacity += Number(room.capacity) || 0;
      metrics.occupiedBeds += Number(room.occupied) || 0;
      return metrics;
    },
    { totalCapacity: 0, occupiedBeds: 0 }
  );
}
