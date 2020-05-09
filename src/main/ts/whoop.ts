const baseUrl = "https://api-7.whoop.com";

export interface IWhoopToken {
    token: string;
    userId: string;
    validUntil: Date;
}

export interface IHeartRateDatum {
    time: number;
    bpm: number;
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

export function heartRate(token: IWhoopToken, start: Date, end: Date) {
    return fetch(`https://f9dcpfb4u4.execute-api.us-east-2.amazonaws.com/default/fetchWhoop`,
        {
            method: "POST",
            body: JSON.stringify({
                path: `/users/${
                    token.userId
                    }/metrics/heart_rate?step=60&start=${start.toISOString()}&end=${end.toISOString()}`,
                bearer: token.token
            })
        }
    )
        .then((response) => response.json())
        .then((json) => {
            const hr: IHeartRateDatum[] = json.values.map((datum: any) => {
                return { time: datum.time, bpm: Number(datum.data) ?? 0 };
            });
            return hr;
        });
}
