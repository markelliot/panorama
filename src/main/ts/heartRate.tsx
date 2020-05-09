import { FormGroup, NumericInput } from "@blueprintjs/core";
import { DateInput } from "@blueprintjs/datetime";
import * as React from "react";
import Plot from "react-plotly.js";
import "./heartRate.scss";
import { IHeartRateDatum } from "./whoop";
import * as whoop from "./whoop";

interface IHeartRateProps {
    token: whoop.IWhoopToken;
}

interface IHeartRateState {
    date: Date;
    hr: IHeartRateDatum[];
    rmr?: number;
    shr?: number;
    x0?: number;
    x1?: number;
}

interface IenergyExpenditureDatum {
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
        hr: [],
    };

    public componentDidMount() {
        if (this.state.hr.length === 0) {
            this.getHeartRate();
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
        const energyExpenditure: IenergyExpenditureDatum[] = [];
        const cumEnergyExpenditure: IenergyExpenditureDatum[] = [];
        let dailyenergyExpenditure = -1;
        if (this.state.rmr && this.state.shr && this.state.x0 && this.state.x1 && this.state.hr.length > 0) {
            // calculate
            dailyenergyExpenditure = 0;
            const hr = this.state.hr;
            for (let i = 1; i < hr.length; i++) {
                const deltaTime = hr[i].time - hr[i - 1].time; // milliseconds
                if (deltaTime < 70000) {
                    const ee = this.energyExpenditure(hr[i].bpm) * (deltaTime / 60000);
                    energyExpenditure.push({
                        energyExpenditure: ee,
                        time: hr[i].time,
                    });
                    dailyenergyExpenditure = dailyenergyExpenditure + ee;
                    cumEnergyExpenditure.push({
                        energyExpenditure: dailyenergyExpenditure,
                        time: hr[i].time,
                    });
                }
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
                </div>
                <div className="display">
                    <p>
                        Daily Energy Expenditure: <strong>{Math.round(dailyenergyExpenditure * 100) / 100} kcal</strong>
                    </p>
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
                        this.state.hr,
                        (e) => new Date(e.time),
                        (e) => e.bpm,
                    )}
                </div>
            </div>
        );
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
                            title,
                            yaxis: {
                                title: yLabel,
                            },
                        }}
                    />
                </div>
            );
        }
        return null;
    }

    private getHeartRate = () => {
        const start = this.state.date;
        const end = new Date(this.state.date);
        end.setSeconds(end.getSeconds() + 86400);
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
        this.setState({ ...this.state, date }, () => this.getHeartRate());
    }
}
