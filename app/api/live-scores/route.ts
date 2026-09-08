import { NextResponse } from 'next/server';
import { client, getScoreboard } from 'cfbd';

export async function GET() {
    try {
        client.setConfig({
            headers: {
                'Authorization': `Bearer ${process.env.CFB_API_KEY}`,
            },
        });

        console.log('Fetching live scores from CFBD...');
        const scoreboard = await getScoreboard({ query: { classification: 'fbs' } });
        const liveScores = (scoreboard.data ?? []).map((game: any) => {
            // Map CFBD scoreboard fields to your expected schema
            // game object fields based on cfbd scoreboard types: id, clock, situation, period, homeTeam, awayTeam, etc.

            let status: 'scheduled' | 'in_progress' | 'completed' = 'scheduled';
            const homePoints = game.homeTeam?.points;
            const awayPoints = game.awayTeam?.points;
            const hasFinalScores = homePoints !== null && homePoints !== undefined
                && awayPoints !== null && awayPoints !== undefined;
            const hasLiveDetails = Boolean(game.clock || game.situation || game.period);

            if (game.completed) {
                status = 'completed';
            } else if (hasFinalScores && !hasLiveDetails) {
                // CFBD can omit `completed` after the clock and game state disappear.
                status = 'completed';
            } else if (hasLiveDetails || hasFinalScores) {
                status = 'in_progress';
            }

            return {
                id: String(game.id),
                status: status,
                clock: game.clock ?? null,
                situation: game.situation ?? null,
                period: game.period ?? null,
                homeTeam: {
                    name: game.homeTeam?.name ?? '',
                },
                awayTeam: {
                    name: game.awayTeam?.name ?? '',
                },
                home_score: game.homeTeam?.points ?? 0,
                away_score: game.awayTeam?.points ?? 0,
            };
        });
        // console.log('Live scores fetched:', liveScores);
        return NextResponse.json({ success: true, data: liveScores });
    } catch (error) {
        console.error('Failed to fetch live scores from CFBD:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch scores' }, { status: 500 });
    }
}