import cron from 'node-cron';
import { prisma } from '../prisma';
import { RideStatus } from '@prisma/client';

export const startRideCompletionJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const expiredRides = await prisma.ride.findMany({
        where: {
          status: RideStatus.PENDING,
          latestDeparture: {
            lt: new Date()
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true
            }
          },
          participants: {
            select: {
              id: true
            }
          }
        }
      });

      for (const ride of expiredRides) {
        await prisma.$transaction(async (tx) => {
          await tx.ride.update({
            where: {
              id: ride.id
            },
            data: {
              status: RideStatus.COMPLETED
            }
          });

          const userIds = [
            ...new Set([
              ride.owner.id,
              ...ride.participants.map((p) => p.id)
            ])
          ];

          await tx.notification.createMany({
            data: userIds.map((id) => ({
              receiverId: id,
              message: `${ride.owner.name}'s ride has been automatically marked as completed.`
            }))
          });
        });
      }

      if (expiredRides.length > 0) {
        console.log(
          `Auto-completed ${expiredRides.length} expired rides`
        );
      }
    } catch (err) {
      console.error('Ride completion cron failed:', err);
    }
  });
};