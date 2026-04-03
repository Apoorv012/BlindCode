import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import Contest, { ContestStatusEnum } from './models/Contest';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });



  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);



    // ✨ BULLETPROOF SOCKET: Admin directly ends contest (No Race Conditions)
    socket.on('admin_end_contest', async ({ contestId }) => {
      console.log(`🔥 ADMIN COMMAND: Force ending contest -> ${contestId}`);
      try {
        // Force update the DB directly! (Bypasses any Parallel Save Errors)
        const result = await Contest.updateOne(
          { contestCode: contestId },
          { $set: { status: ContestStatusEnum.ended, endedAt: new Date() } }
        );

        console.log(`✅ DB UPDATE SUCCESS:`, result);

        // LOUD SPEAKER: Sabko turant lock screen dikhao!
        io.to(`contest_${contestId}`).emit('contest_update', { status: 'ended' });
        io.to(`admin_${contestId}`).emit('contest_update', { status: 'ended' });

      } catch (err) {
        console.error("❌ Error ending contest via socket:", err);
      }
    });

    socket.on('participant_join', async ({ contestId, participantId }) => {
      // Join contest room
      socket.join(`contest_${contestId}`);
      try {
        const contest = await Contest.findOne({ contestCode: contestId });
        if (contest) {
          const participant = contest.participants.id(participantId);
          if (participant) {
            participant.status = 'online';
            participant.lastActive = new Date();
            await contest.save();
            io.to(`admin_${contestId}`).emit('participant_update');
          }
        }

        socket.data.contestId = contestId;
        socket.data.participantId = participantId;
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('update_status', async (payload) => {
      const { contestId, participantId, status, compiles, wrongSubmissions, reveals, currentProblemId, score } = payload;
      try {
        const contest = await Contest.findOne({ contestCode: contestId });
        if (contest) {
          const participant = contest.participants.id(participantId);
          if (participant) {
            if (status && participant.status !== 'submitted') participant.status = status;
            if (compiles !== undefined) participant.compiles = compiles;
            if (wrongSubmissions !== undefined) participant.wrongSubmissions = wrongSubmissions;
            if (reveals !== undefined) participant.reveals = reveals;
            if (currentProblemId) participant.currentProblemId = currentProblemId;
            if (score !== undefined) participant.score = score;
            participant.lastActive = new Date();
            await contest.save();
            io.to(`admin_${contestId}`).emit('participant_update');
          }
        }
      } catch (err) { }
    });

    socket.on('disconnect', async () => {
      const { contestId, participantId } = socket.data;
      if (contestId && participantId) {
        try {
          const contest = await Contest.findOne({ contestCode: contestId });
          if (contest) {
            const participant = contest.participants.id(participantId);
            if (participant && participant.status !== 'unjoined' && participant.status !== 'submitted') {
              participant.status = 'offline';
              await contest.save();
              io.to(`admin_${contestId}`).emit('participant_update');
            }
          }
        } catch (err) { }
      }
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
