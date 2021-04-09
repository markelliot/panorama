import { FormGroup, NumericInput, Radio, RadioGroup } from "@blueprintjs/core";
import { DateInput } from "@blueprintjs/datetime";
import moment from "moment";
import * as React from "react";
import Plot from "react-plotly.js";
import "./heartRate.scss";
import { IHeartRateDay } from "./whoop";
import * as whoop from "./whoop";

interface IHeartRateProps {
    token: whoop.IWhoopToken;
}

enum DayType {
    CALENDAR = "calendar",
    SLEEP = "sleep",
}

interface IHeartRateState {
    day?: whoop.IDay;
    dayType: DayType;
    date: Date;
    hr?: IHeartRateDay;
    rmr?: number;
    shr?: number;
    x0?: number;
    x1?: number;
}

interface IEnergyExpenditureDatum {
    energyExpenditure: number;
    time: number;
}

const now = new Date();
now.setSeconds(0);
now.setMinutes(0);
now.setHours(0);

export class HeartRate extends React.Component<IHeartRateProps, IHeartRateState> {
    public state: IHeartRateState = {
        date: now,
        dayType: DayType.SLEEP,
    };

    public componentDidMount() {
        if (!this.state.hr) {
            this.getData();
        }
        let updatedState = {};
        // TODO(markelliot) make functions to do this
        if (!this.state.rmr) {
            const rmr = localStorage.getItem("pnoe.rmr");
            if (rmr) {
                updatedState = { ...updatedState, rmr: Number(rmr) };
            }
        }
        if (!this.state.shr) {
            const shr = localStorage.getItem("pnoe.shr");
            if (shr) {
                updatedState = { ...updatedState, shr: Number(shr) };
            }
        }
        if (!this.state.x0) {
            const x0 = localStorage.getItem("pnoe.x0");
            if (x0) {
                updatedState = { ...updatedState, x0: Number(x0) };
            }
        }
        if (!this.state.x1) {
            const x1 = localStorage.getItem("pnoe.x1");
            if (x1) {
                updatedState = { ...updatedState, x1: Number(x1) };
            }
        }
        this.setState({ ...this.state, ...updatedState });
    }

    public render() {
        // TODO(markelliot): we should do this off the UI thread as a result of state updates
        const energyExpenditure: IEnergyExpenditureDatum[] = [];
        const cumEnergyExpenditure: IEnergyExpenditureDatum[] = [];
        let dailyEnergyExpenditure = -1;
        if (this.state.rmr && this.state.shr && this.state.x0 && this.state.x1 && this.state.hr) {
            // calculate
            dailyEnergyExpenditure = 0;
            const hr = this.state.hr.hr;
            for (let i = 5; i < hr.length; i++) {
                // const deltaTime = hr[i].time - hr[i - 5].time; // milliseconds
                const deltaTime = 60000;
                const bpm = (hr[i].bpm + hr[i - 1].bpm + hr[i - 2].bpm + hr[i - 3].bpm + hr[i - 4].bpm) / 5;
                // if (deltaTime < 60000 * 5.1) {
                const ee = this.energyExpenditure(bpm) * (deltaTime / 60000);
                energyExpenditure.push({
                    energyExpenditure: ee,
                    time: hr[i].time,
                });
                dailyEnergyExpenditure = dailyEnergyExpenditure + ee;
                cumEnergyExpenditure.push({
                    energyExpenditure: dailyEnergyExpenditure,
                    time: hr[i].time,
                });
                // }
            }
        }

        return (
            <div className="heartRate">
                <div className="controls">
                    <FormGroup label="Resting Metabolic Rate (kcal/min)" labelFor="rmr">
                        <NumericInput id="rmr" value={this.state.rmr} onValueChange={this.updateRmr} />
                    </FormGroup>
                    <FormGroup label="Starting Heart Rate (bpm)" labelFor="shr">
                        <NumericInput id="shr" value={this.state.shr} onValueChange={this.updateShr} />
                    </FormGroup>
                    <FormGroup label="PNOE Regression Coeff x0" labelFor="x0">
                        <NumericInput id="x0" value={this.state.x0} onValueChange={this.updateX0} />
                    </FormGroup>
                    <FormGroup label="PNOE Regression Coeff x1" labelFor="x1">
                        <NumericInput id="x1" value={this.state.x1} onValueChange={this.updateX1} />
                    </FormGroup>
                </div>
                <div className="controls">
                    <FormGroup label="Observation Date">
                        <DateInput
                            formatDate={this.formatDate}
                            parseDate={this.parseDate}
                            value={this.state.date}
                            onChange={this.updateObservationDate}
                        />
                    </FormGroup>
                    <RadioGroup
                        inline={true}
                        label="Day Type"
                        onChange={this.updateDayType}
                        selectedValue={this.state.dayType}>
                        <Radio label="Sleep Day" value={DayType.SLEEP} />
                        <Radio label="Calendar Day" value={DayType.CALENDAR} />
                    </RadioGroup>
                </div>
                <div className="display">
                    <div className="summary">
                        {this.state.day ? this.daySummary(this.state.day!) : null}
                        {this.dailyEe(dailyEnergyExpenditure)}
                    </div>
                    {this.scatterPlot(
                        "Energy Expenditure",
                        "kcal/min",
                        energyExpenditure,
                        (e) => new Date(e.time),
                        (e) => e.energyExpenditure,
                    )}
                    {this.scatterPlot(
                        "Cumulative Energy Expenditure",
                        "kcal",
                        cumEnergyExpenditure,
                        (e) => new Date(e.time),
                        (e) => e.energyExpenditure,
                    )}
                    {this.scatterPlot(
                        "Heart Rate over Time",
                        "beats per minute",
                        this.state.hr ? this.state.hr.hr : [],
                        (e) => new Date(e.time),
                        (e) => e.bpm,
                    )}
                </div>
            </div>
        );
    }

    private daySummary(day: whoop.IDay) {
        const start = moment(day.during.lower);
        const end = moment(day.during.upper);

        return <div>
            <strong>Whoop Statistics</strong>
            <table>
                <tbody>
                    <tr>
                        <td>Sleep Day</td>
                        <td>{start.format("HH:mm:ss (dd)")} - {end.isValid() ? end.format("HH:mm:ss (dd)") : null}</td>
                    </tr>
                    <tr>
                        <td>Energy Expenditure</td>
                        <td>{Math.round(day.strain.kilojoules * 100 / 4.184) / 100} kcal</td>
                    </tr>
                </tbody>
            </table>
        </div>;
    }

    private dailyEe(dailyEnergyExpenditure: number) {
        if (0 < dailyEnergyExpenditure) {
            const start = moment(this.state.hr!.start);
            const end = moment(this.state.hr!.end);

            return <div>
                <strong>Computed Statistics</strong>
                <table>
                    <tbody>
                        <tr>
                            <td>Day</td>
                            <td>{start.format("HH:mm:ss (dd)")} - {end.isValid()
                                ? end.format("HH:mm:ss (dd)") : null}</td>
                        </tr>
                        <tr>
                            <td>Energy Expenditure</td>
                            <td>{Math.round(dailyEnergyExpenditure * 100) / 100} kcal</td>
                        </tr>
                    </tbody>
                </table>
            </div>;
        }
    }

    private scatterPlot<T>(
        title: string,
        yLabel: string,
        arr: T[],
        dateExtractor: (datum: T) => Date,
        valueExtractor: (datum: T) => number,
    ) {
        if (arr.length > 0) {
            return (
                <div>
                    <Plot
                        data={[
                            {
                                line: {
                                    width: 1,
                                },
                                mode: "lines",
                                type: "scatter",
                                x: arr.map(dateExtractor),
                                y: arr.map(valueExtractor),
                            },
                        ]}
                        layout={{
                            autosize: true,
                            title,
                            yaxis: {
                                title: yLabel,
                            },
                        }}
                        style={{ width: "100%", height: "100%" }}
                        useResizeHandler={true}
                    />
                </div>
            );
        }
        return null;
    }

    private getData = () => {
        const localDayStart = this.state.date;

        switch (this.state.dayType) {
            case DayType.SLEEP:
                whoop.sleepCycle(this.props.token, localDayStart)
                    .then((days) => {
                        this.setState({ ...this.state, day: days[0] });

                        const sleepDayStart = moment(days[0].during.lower).toDate();
                        const sleepDayEnd = days[0].during.upper ? moment(days[0].during.upper).toDate() : new Date();
                        this.getHeartRate(sleepDayStart, sleepDayEnd);
                    })
                    .catch((error) => console.error("error getting sleep cycle data", error));
                break;
            case DayType.CALENDAR:
                const localDayEnd = new Date(this.state.date);
                localDayEnd.setSeconds(localDayEnd.getSeconds() + 86400);
                this.getHeartRate(localDayStart, localDayEnd);
                break;
        }
    }

    private getHeartRate = (start: Date, end: Date) => {
        whoop
            .heartRate(this.props.token, start, end)
            .then((hr) => this.setState({ ...this.state, hr }))
            .catch((error) => console.error("error updating the heartRate", error));
    }

    private formatDate = (date: Date): string => {
        return date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();
    }

    private parseDate = (str: string): Date => {
        return new Date(str);
    }

    private energyExpenditure = (heartRate: number): number => {
        if (this.state.shr! < heartRate) {
            return this.state.x0! + this.state.x1! * heartRate;
        } else {
            return this.state.rmr!;
        }
    }

    private updateRmr = (rmr: number) => {
        if (!isNaN(rmr)) {
            this.setState({ ...this.state, rmr });
            localStorage.setItem("pnoe.rmr", String(rmr));
        }
    }

    private updateShr = (shr: number) => {
        if (!isNaN(shr)) {
            this.setState({ ...this.state, shr });
            localStorage.setItem("pnoe.shr", String(shr));
        }
    }

    private updateX0 = (x0: number) => {
        if (!isNaN(x0)) {
            this.setState({ ...this.state, x0 });
            localStorage.setItem("pnoe.x0", String(x0));
        }
    }

    private updateX1 = (x1: number) => {
        if (!isNaN(x1)) {
            this.setState({ ...this.state, x1 });
            localStorage.setItem("pnoe.x1", String(x1));
        }
    }

    private updateObservationDate = (date: Date) => {
        this.setState({ ...this.state, date }, () => this.getData());
    }

    private updateDayType: React.FormEventHandler<HTMLInputElement> = (evt) => {
        const dayType = this.parseDayType((evt.target as HTMLInputElement).value);
        this.setState({ ...this.state, dayType }, this.getData);
    }

    private parseDayType(str: string) {
        switch (str) {
            default:
            case DayType.SLEEP:
                return DayType.SLEEP;
            case DayType.CALENDAR:
                return DayType.CALENDAR;
        }
    }
}
