import { NextResponse } from 'next/server';
import { client, getCalendar } from 'cfbd';
import { formatDateRange } from '@/utils/time';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2026';
    try {
        client.setConfig({
            headers: {
                'Authorization': `Bearer ${process.env.CFB_API_KEY}`,
            }
        });
        console.log('Fetching weeks for year:', year);
        const weeks = await getCalendar({
            query: {
                year: parseInt(year),
            },
        });
        const schedules = [];
        for (const week of weeks.data ?? []) {
            if (week.seasonType !== 'regular') continue; // Skip non-regular season weeks for now
            console.log(`Week ${week.week}: ${week.startDate} (${week.endDate})`);
            schedules.push({
                week: week.week,
                label: `${year} Week ${week.week}`,
                date_range: formatDateRange(week.startDate, week.endDate),
            });
        }

        return NextResponse.json({ success: true, weeks: schedules });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to load weeks' }, { status: 500 });
    }
}