import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { client, getLines, getMedia, getGames } from 'cfbd';
import { formatDateRange, formatGameTime } from '@/utils/time';

export async function GET(request: Request) {
    async function getGameDetails(gameId: number) {
        console.log('Fetching game details for game ID:', gameId);
        let gameLocation: string = "N/A";
        const gameDetails = getGames({
            query: {
                id: gameId,
            },
        });
        for (const game of (await gameDetails).data ?? []) {
            gameLocation = game.venue ?? "N/A";
            break; // Exit the loop after finding the first matching game
        }
        return gameLocation;
    }
    async function getBroadcastInfo(year: number, week: number, homeTeam: string) {
        console.log('Fetching broadcast info for year:', year, 'week:', week, 'home team:', homeTeam);
        let outlet: string = "N/A";
        const media = getMedia({
            query: {
                year: year,
                week: week,
                team: homeTeam,
                seasonType: 'regular',
            },
        });
        for (const item of (await media).data ?? []) {
            if (String(item.mediaType) === 'tv' || String(item.mediaType) === 'web') {
                outlet = String(item.outlet);
                break; // Exit the loop after finding the first matching media type 
            }
        }
        return outlet;
    }
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2026';
    const week = searchParams.get('week') || '1';

    const cacheDir = path.join(process.cwd(), 'cache', 'schedules');
    const cacheFile = path.join(cacheDir, `${year}_w${week}.json`);

    try {
        // 1. Check if cached JSON file already exists
        try {
            const cachedData = await fs.readFile(cacheFile, 'utf-8');
            return NextResponse.json(JSON.parse(cachedData));
        } catch {
            // File doesn't exist yet, proceed to fetch
        }

        // 2. Make GET call to external API using secure .env tokens
        client.setConfig({
            headers: {
                'Authorization': `Bearer ${process.env.CFB_API_KEY}`,
            }
        });
        console.log('Fetching games for week:', week, 'year:', year);
        const games = await getLines({
            query: {
                year: parseInt(year),
                week: parseInt(week),
                seasonType: 'regular',
            },
        });
        if (games.error) {
            throw new Error(`External API error: ${JSON.stringify(games.error)  }`);
        }
        

        // 3. Format external data into your expected frontend schema
        const rawGames = games.data ?? [];
        const timeSlots = new Map<string, {
            slot_label: string;
            slot_utc: string;
            games: Array<{
                id: string;
                neutral_site: boolean;
                location: string;
                broadcast: string;
                home_team: {
                    name: string;
                    short_name: string;
                    conference: string;
                    rank: number | null;
                    logo_url: string;
                };
                away_team: {
                    name: string;
                    short_name: string;
                    conference: string;
                    rank: number | null;
                    logo_url: string;
                };
                odds: {
                    spread: string | null;
                    over_under: number | null;
                    predicted_spread: string | null;
                };
            }>;
        }>();

        for (const game of rawGames) {
            const slot = timeSlots.get(game.startDate) ?? {
                slot_label: `${formatGameTime(game.startDate).date} • ${formatGameTime(game.startDate).time}`,
                slot_utc: game.startDate,
                games: [],
            };
            const draftKingsLine = game.lines?.find((line) => line.provider === 'DraftKings');

            slot.games.push({
                id: String(game.id),
                neutral_site: false,
                location: await getGameDetails(game.id),
                broadcast: await getBroadcastInfo(parseInt(year), parseInt(week), game.homeTeam),
                home_team: {
                    name: game.homeTeam,
                    short_name: game.homeTeam,
                    conference: game.homeConference ?? 'Independent',
                    rank: null,
                    logo_url: '',
                },
                away_team: {
                    name: game.awayTeam,
                    short_name: game.awayTeam,
                    conference: game.awayConference ?? 'Independent',
                    rank: null,
                    logo_url: '',
                },
                odds: {
                    spread: draftKingsLine?.formattedSpread ?? null,
                    over_under: draftKingsLine?.overUnder ?? null,
                    predicted_spread: null,
                },
            });
            timeSlots.set(game.startDate, slot);
        }

        const formattedData = {
            season: Number(year),
            week: Number(week),
            week_label: `${year} Week ${week}`,
            date_range: rawGames.length > 0
                ? formatDateRange(
                    rawGames.reduce((earliest, game) => game.startDate < earliest ? game.startDate : earliest, rawGames[0].startDate),
                    rawGames.reduce((latest, game) => game.startDate > latest ? game.startDate : latest, rawGames[0].startDate),
                )
                : '',
            time_slots: Array.from(timeSlots.values()),
        };

        // 4. Save/Cache the json file to disk so future requests skip the external API call
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(cacheFile, JSON.stringify(formattedData, null, 2), 'utf-8');

        return NextResponse.json(formattedData);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}