import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import Contest, { ContestStatusEnum } from './models/Contest';
import { recalculateScore } from './scoreEngine';

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

    // ─── Admin Force-End Contest ───────────────────────────────────────
    socket.on('admin_end_contest', async ({ contestId }) => {
      console.log(`🔥 ADMIN COMMAND: Force ending contest -> ${contestId}`);
      try {
        const result = await Contest.updateOne(
          { contestCode: contestId },
          { $set: { status: ContestStatusEnum.ended, endedAt: new Date() } }
        );
        console.log(`✅ DB UPDATE SUCCESS:`, result);

        io.to(`contest_${contestId}`).emit('contest_update', { status: 'ended' });
        io.to(`admin_${contestId}`).emit('contest_update', { status: 'ended' });
      } catch (err) {
        console.error("❌ Error ending contest via socket:", err);
      }
    });

    // ─── Participant Join (atomic $set) ───────────────────────────────
    socket.on('participant_join', async ({ contestId, participantId }) => {
      socket.join(`contest_${contestId}`);
      try {
        await Contest.updateOne(
          { contestCode: contestId, 'participants._id': participantId },
          { $set: { 'participants.$.status': 'online', 'participants.$.lastActive': new Date() } }
        );
        io.to(`admin_${contestId}`).emit('participant_update');

        socket.data.contestId = contestId;
        socket.data.participantId = participantId;
      } catch (err) {
        console.error(err);
      }
    });

    // ─── Heartbeat / Status Update (atomic $set — NO full doc save) ──
    socket.on('update_status', async (payload) => {
      const { contestId, participantId, status, compiles, currentProblemId } = payload;
      try {
        const setObj: any = { 'participants.$.lastActive': new Date() };
        if (status) setObj['participants.$.status'] = status;
        if (compiles !== undefined) setObj['participants.$.compiles'] = compiles;
        if (currentProblemId) setObj['participants.$.currentProblemId'] = currentProblemId;

        await Contest.updateOne(
          { contestCode: contestId, 'participants._id': participantId },
          { $set: setObj }
        );
        io.to(`admin_${contestId}`).emit('participant_update');
      } catch (err) { }
    });

    // ─── 🔥 PENALTY EVENT — atomic $inc, can't be overwritten ─────────
    socket.on('apply_penalty', async (payload) => {
      const { contestId, participantId, type } = payload;
      // type: 'reveal'
      try {
        if (type === 'reveal') {
          // Step 1: Atomic increment — heartbeat CAN'T overwrite this
          await Contest.updateOne(
            { contestCode: contestId, 'participants._id': participantId },
            {
              $inc: { 'participants.$.reveals': 1 },
              $set: { 'participants.$.lastActive': new Date() }
            }
          );
        }

        // Step 2: Read fresh doc and recalculate score
        const contest = await Contest.findOne({ contestCode: contestId });
        if (!contest) return;
        const participant = contest.participants.id(participantId);
        if (!participant) return;

        const newScore = await recalculateScore(participant);

        // Step 3: Atomic score update
        await Contest.updateOne(
          { contestCode: contestId, 'participants._id': participantId },
          { $set: { 'participants.$.score': newScore } }
        );

        // Step 4: Send updated score BACK to the specific participant
        socket.emit('score_update', { score: newScore });

        // Notify admin dashboard + leaderboard
        io.to(`admin_${contestId}`).emit('participant_update');
        io.to(`contest_${contestId}`).emit('participant_update');

      } catch (err) {
        console.error('❌ apply_penalty error:', err);
      }
    });

    // ─── Disconnect (atomic $set) ─────────────────────────────────────
    socket.on('disconnect', async () => {
      const { contestId, participantId } = socket.data;
      if (contestId && participantId) {
        try {
          // Only set offline if not already 'submitted' or 'unjoined'
          await Contest.updateOne(
            {
              contestCode: contestId,
              'participants._id': participantId,
              'participants.$.status': { $nin: ['unjoined', 'submitted'] }
            },
            { $set: { 'participants.$.status': 'offline' } }
          );
          io.to(`admin_${contestId}`).emit('participant_update');
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
