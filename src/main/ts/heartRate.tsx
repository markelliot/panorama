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

interface IPnoeState {
    r1Const?: number;
    r2LowerBound?: number;
    r2Const?: number;
    r2Multiplier?: number;
    r3LowerBound?: number;
    r3Const?: number;
    r3Multiplier?: number;
}

interface IHeartRateState {
    day?: whoop.IDay;
    dayType: DayType;
    date: Date;
    hr?: IHeartRateDay;
    pnoe: IPnoeState;
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
        pnoe: {},
    };

    public componentDidMount() {
        if (!this.state.hr) {
            this.getData();
        }
        let updatedState = {};
        updatedState = this.getStateFromLocalStorage(updatedState, "r1Const");
        updatedState = this.getStateFromLocalStorage(updatedState, "r2LowerBound");
        updatedState = this.getStateFromLocalStorage(updatedState, "r2Const");
        updatedState = this.getStateFromLocalStorage(updatedState, "r2Multiplier");
        updatedState = this.getStateFromLocalStorage(updatedState, "r3LowerBound");
        updatedState = this.getStateFromLocalStorage(updatedState, "r3Const");
        updatedState = this.getStateFromLocalStorage(updatedState, "r3Multiplier");
        this.setState({ ...this.state, pnoe: updatedState });
    }

    public render() {
        // TODO(markelliot): we should do this off the UI thread as a result of state updates
        const energyExpenditure: IEnergyExpenditureDatum[] = [];
        const cumEnergyExpenditure: IEnergyExpenditureDatum[] = [];
        let dailyEnergyExpenditure = -1;
        if (this.isPnoeStateSet() && this.state.hr) {
            // calculate
            dailyEnergyExpenditure = 0;
            const hr = this.state.hr.hr;
            for (let i = 5; i < hr.length; i++) {
                const deltaTime = 60000;
                const bpm = (hr[i].bpm + hr[i - 1].bpm + hr[i - 2].bpm + hr[i - 3].bpm + hr[i - 4].bpm) / 5;
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
            }
        }

        return (
            <div className="heartRate">
                <div className="controls">
                    <FormGroup label="Resting Metabolic Rate (kcal/min)" labelFor="r1Const">
                        <NumericInput id="r1Const" value={this.state.pnoe.r1Const} onValueChange={this.updateR1Const} />
                    </FormGroup>
                    <FormGroup label="Region 2 HR Lower Bound (bpm)" labelFor="r2LowerBound">
                        <NumericInput id="r2LowerBound"
                            value={this.state.pnoe.r2LowerBound}
                            onValueChange={this.updateR2LowerBound} />
                    </FormGroup>
                    <FormGroup label="Region 2 Constant" labelFor="r2Const">
                        <NumericInput id="r2Const"
                            value={this.state.pnoe.r2Const}
                            onValueChange={this.updateR2Const} />
                    </FormGroup>
                    <FormGroup label="Region 2 HR Factor" labelFor="r2Multiplier">
                        <NumericInput id="r2Multiplier"
                            value={this.state.pnoe.r2Multiplier}
                            onValueChange={this.updateR2Multiplier} />
                    </FormGroup>
                    <FormGroup label="Region 3 HR Lower Bound (bpm)" labelFor="r2LowerBound">
                        <NumericInput id="r3LowerBound"
                            value={this.state.pnoe.r3LowerBound}
                            onValueChange={this.updateR3LowerBound} />
                    </FormGroup>
                    <FormGroup label="Region 3 Constant" labelFor="r2Const">
                        <NumericInput id="r3Const"
                            value={this.state.pnoe.r3Const}
                            onValueChange={this.updateR3Const} />
                    </FormGroup>
                    <FormGroup label="Region 3 HR Factor" labelFor="r2Multiplier">
                        <NumericInput id="r3Multiplier"
                            value={this.state.pnoe.r3Multiplier}
                            onValueChange={this.updateR3Multiplier} />
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

    private getStateFromLocalStorage(updatedState: IPnoeState, item: keyof IPnoeState) {
        if (this.state.pnoe[item] === undefined) {
            const value = localStorage.getItem("pnoe." + item);
            if (value) {
                updatedState[item] = Number(value);
            }
        }
        return updatedState;
    }

    private isPnoeStateSet() {
        return this.state.pnoe.r1Const
                && this.state.pnoe.r2Const && this.state.pnoe.r2LowerBound && this.state.pnoe.r2Multiplier
                && this.state.pnoe.r3Const && this.state.pnoe.r3LowerBound && this.state.pnoe.r3Multiplier;
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
        if (heartRate < this.state.pnoe.r2LowerBound!) {
            return this.state.pnoe.r1Const!;
        }

        if (heartRate < this.state.pnoe.r3LowerBound!) {
            return this.state.pnoe.r2Multiplier! * heartRate + this.state.pnoe.r2Const!;
        }

        return this.state.pnoe.r3Multiplier! * heartRate + this.state.pnoe.r3Const!;
    }

    private updateR1Const = (r1Const: number) => {
        if (!isNaN(r1Const)) {
            this.setState({ ...this.state, pnoe: {...this.state.pnoe, r1Const} });
            localStorage.setItem("pnoe.r1Const", String(r1Const));
        }
    }

    private updateR2LowerBound = (r2LowerBound: number) => {
        if (!isNaN(r2LowerBound)) {
            this.setState({ ...this.state, pnoe: {...this.state.pnoe, r2LowerBound} });
            localStorage.setItem("pnoe.r2LowerBound", String(r2LowerBound));
        }
    }

    private updateR2Const = (r2Const: number) => {
        if (!isNaN(r2Const)) {
            this.setState({ ...this.state, pnoe: {...this.state.pnoe, r2Const} });
            localStorage.setItem("pnoe.r2Const", String(r2Const));
        }
    }

    private updateR2Multiplier = (r2Multiplier: number) => {
        if (!isNaN(r2Multiplier)) {
            this.setState({ ...this.state, pnoe: {...this.state.pnoe, r2Multiplier} });
            localStorage.setItem("pnoe.r2Multiplier", String(r2Multiplier));
        }
    }

    private updateR3LowerBound = (r3LowerBound: number) => {
        if (!isNaN(r3LowerBound)) {
            this.setState({ ...this.state, pnoe: {...this.state.pnoe, r3LowerBound} });
            localStorage.setItem("pnoe.r3LowerBound", String(r3LowerBound));
        }
    }

    private updateR3Const = (r3Const: number) => {
        if (!isNaN(r3Const)) {
            this.setState({ ...this.state, pnoe: {...this.state.pnoe, r3Const} });
            localStorage.setItem("pnoe.r3Const", String(r3Const));
        }
    }

    private updateR3Multiplier = (r3Multiplier: number) => {
        if (!isNaN(r3Multiplier)) {
            this.setState({ ...this.state, pnoe: {...this.state.pnoe, r3Multiplier} });
            localStorage.setItem("pnoe.r3Multiplier", String(r3Multiplier));
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
