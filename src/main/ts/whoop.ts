import moment from "moment";

const baseUrl = "https://api-7.whoop.com";
const corsSafeBaseUrl = "https://musicaldiscoveries.com/panorama/whoop.php";

export interface IWhoopToken {
    token: string;
    userId: string;
    validUntil: Date;
}

export interface IHeartRateDatum {
    time: number;
    bpm: number;
}

export interface IHeartRateDay {
    hr: IHeartRateDatum[];
    start: Date;
    end: Date;
}

export interface IDay {
    during: ITimeRange;
    strain: IStrain;
}

export interface ITimeRange {
    bounds: string;
    lower: string;
    upper: string;
}

export interface IStrain {
    averageHeartRate: number;
    maxHeartRate: number;
    kilojoules: number;
}

function params(params: { [key: string]: string }) {
    return Object.entries(params)
        .map(kv => `${kv[0]}=${kv[1]}`)
        .reduce((acc, item) => acc = acc + "&" + item);
}

export function login(email: string, password: string): Promise<IWhoopToken> {
    return fetch(`${baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            username: email,
            password: password,
            grant_type: "password",
            issueRefresh: "false",
        }),
    })
        .then((response) => response.json())
        .then((json) => {
            console.log(json);
            const validUntil = new Date();
            validUntil.setSeconds(validUntil.getSeconds() + json.expires_in);
            return {
                token: json.access_token,
                userId: json.user.id,
                validUntil: validUntil,
            };
        });
}

export function sleepCycle(token: IWhoopToken, day: Date) {
    const query = params({
        start: day.toISOString(),
        end: day.toISOString()
    });
    return fetch(corsSafeBaseUrl,
        {
            method: "POST",
            body: JSON.stringify({
                path: `/users/${token.userId}/cycles?${query}`,
                bearer: token.token
            })
        })
        .then((response) => response.json())
        .then((json) => json as IDay[]);
}

export function heartRate(token: IWhoopToken, start: Date, end: Date): Promise<IHeartRateDay> {
    const query = params({
        step: "60",
        start: start.toISOString(),
        end: end.toISOString()
    });
    return fetch(corsSafeBaseUrl,
        {
            method: "POST",
            body: JSON.stringify({
                path: `/users/${token.userId}/metrics/heart_rate?${query}`,
                bearer: token.token
            })
        }
    )
        .then((response) => response.json())
        .then((json) => {
            const hr: IHeartRateDatum[] = json.values.map((datum: any) => {
                return { time: datum.time, bpm: Number(datum.data) ?? 0 };
            });
            return {
                hr,
                start,
                end
            }
        });
}
