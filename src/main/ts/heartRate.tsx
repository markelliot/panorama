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

interface IPnoeForm {
  r1Const?: string;
  r2LowerBound?: string;
  r2Const?: string;
  r2Multiplier?: string;
  r3LowerBound?: string;
  r3Const?: string;
  r3Multiplier?: string;
}

interface IPnoeState {
  r1Const: number;
  r2LowerBound: number;
  r2Const: number;
  r2Multiplier: number;
  r3LowerBound: number;
  r3Const: number;
  r3Multiplier: number;
}

interface IHeartRateState {
  day?: whoop.IDay;
  dayType: DayType;
  date: Date;
  hr?: IHeartRateDay;
  form: IPnoeForm;
}

interface IEnergyExpenditureDatum {
  energyExpenditure: number;
  time: number;
}

const now = new Date();
now.setSeconds(0);
now.setMinutes(0);
now.setHours(0);

export class HeartRate extends React.Component<
  IHeartRateProps,
  IHeartRateState
> {
  public state: IHeartRateState = {
    date: now,
    dayType: DayType.SLEEP,
    form: {},
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
    this.setState({ ...this.state, form: updatedState });
  }

  public render() {
    // TODO(markelliot): we should do this off the UI thread as a result of state updates
    const pnoe = this.pnoeState(this.state.form);
    const energyExpenditure: IEnergyExpenditureDatum[] = [];
    const cumEnergyExpenditure: IEnergyExpenditureDatum[] = [];
    let dailyEnergyExpenditure = -1;
    if (pnoe && this.state.hr) {
      // calculate
      dailyEnergyExpenditure = 0;
      const hr = this.state.hr.hr;
      for (const tick of hr) {
        // some very basic smoothing
        // const bpm = (hr[i].bpm + hr[i - 1].bpm + hr[i - 2].bpm + hr[i - 3].bpm + hr[i - 4].bpm) / 5;
        const bpm = tick.bpm;
        const ee = this.energyExpenditure(bpm, pnoe);
        energyExpenditure.push({
          energyExpenditure: ee,
          time: tick.time,
        });
        dailyEnergyExpenditure = dailyEnergyExpenditure + ee;
        cumEnergyExpenditure.push({
          energyExpenditure: dailyEnergyExpenditure,
          time: tick.time,
        });
      }
    }

    return (
      <div className="heartRate">
        <div className="controls">
          <FormGroup
            label="Resting Metabolic Rate (kcal/day)"
            labelFor="r1Const"
          >
            <NumericInput
              id="r1Const"
              value={this.state.form.r1Const}
              onValueChange={this.updateR1Const}
            />
          </FormGroup>
          <FormGroup
            label="Region 2 HR Lower Bound (bpm)"
            labelFor="r2LowerBound"
          >
            <NumericInput
              id="r2LowerBound"
              value={this.state.form.r2LowerBound}
              onValueChange={this.updateR2LowerBound}
            />
          </FormGroup>
          <FormGroup label="Region 2 Constant" labelFor="r2Const">
            <NumericInput
              id="r2Const"
              value={this.state.form.r2Const}
              onValueChange={this.updateR2Const}
            />
          </FormGroup>
          <FormGroup label="Region 2 HR Factor" labelFor="r2Multiplier">
            <NumericInput
              id="r2Multiplier"
              value={this.state.form.r2Multiplier}
              onValueChange={this.updateR2Multiplier}
            />
          </FormGroup>
          <FormGroup
            label="Region 3 HR Lower Bound (bpm)"
            labelFor="r2LowerBound"
          >
            <NumericInput
              id="r3LowerBound"
              value={this.state.form.r3LowerBound}
              onValueChange={this.updateR3LowerBound}
            />
          </FormGroup>
          <FormGroup label="Region 3 Constant" labelFor="r2Const">
            <NumericInput
              id="r3Const"
              value={this.state.form.r3Const}
              onValueChange={this.updateR3Const}
            />
          </FormGroup>
          <FormGroup label="Region 3 HR Factor" labelFor="r2Multiplier">
            <NumericInput
              id="r3Multiplier"
              value={this.state.form.r3Multiplier}
              onValueChange={this.updateR3Multiplier}
            />
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
            selectedValue={this.state.dayType}
          >
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
            (e) => e.energyExpenditure
          )}
          {this.scatterPlot(
            "Cumulative Energy Expenditure",
            "kcal",
            cumEnergyExpenditure,
            (e) => new Date(e.time),
            (e) => e.energyExpenditure
          )}
          {this.scatterPlot(
            "Heart Rate over Time",
            "beats per minute",
            this.state.hr ? this.state.hr.hr : [],
            (e) => new Date(e.time),
            (e) => e.bpm
          )}
        </div>
      </div>
    );
  }

  private pnoeState(form: IPnoeForm) {
    if (
      form.r1Const &&
      form.r2Const &&
      form.r2LowerBound &&
      form.r2Multiplier &&
      form.r3Const &&
      form.r3LowerBound &&
      form.r3Multiplier
    ) {
      const r1Const = Number(form.r1Const);
      const r2Const = Number(form.r2Const);
      const r2LowerBound = Number(form.r2LowerBound);
      const r2Multiplier = Number(form.r2Multiplier);
      const r3Const = Number(form.r3Const);
      const r3LowerBound = Number(form.r3LowerBound);
      const r3Multiplier = Number(form.r3Multiplier);

      if (
        !isNaN(r1Const) &&
        !isNaN(r2Const) &&
        !isNaN(r2LowerBound) &&
        !isNaN(r2Multiplier) &&
        !isNaN(r3Const) &&
        !isNaN(r3LowerBound) &&
        !isNaN(r3Multiplier)
      ) {
        return {
          r1Const,
          r2Const,
          r2LowerBound,
          r2Multiplier,
          r3Const,
          r3LowerBound,
          r3Multiplier,
        };
      }
    }
    return undefined;
  }

  private getStateFromLocalStorage(
    updatedState: IPnoeForm,
    item: keyof IPnoeForm
  ) {
    if (this.state.form[item] === undefined) {
      const value = localStorage.getItem("pnoe." + item);
      if (value) {
        updatedState[item] = value;
      }
    }
    return updatedState;
  }

  private daySummary(day: whoop.IDay) {
    const start = moment(day.during.lower);
    const end = moment(day.during.upper);

    return (
      <div>
        <strong>Whoop Statistics</strong>
        <table>
          <tbody>
            <tr>
              <td>Sleep Day</td>
              <td>
                {start.format("HH:mm:ss (dd)")} -{" "}
                {end.isValid() ? end.format("HH:mm:ss (dd)") : null}
              </td>
            </tr>
            <tr>
              <td>Energy Expenditure</td>
              <td>
                {Math.round((day.strain.kilojoules * 100) / 4.184) / 100} kcal
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  private dailyEe(dailyEnergyExpenditure: number) {
    if (0 < dailyEnergyExpenditure) {
      const start = moment(this.state.hr!.start);
      const end = moment(this.state.hr!.end);

      return (
        <div>
          <strong>Computed Statistics</strong>
          <table>
            <tbody>
              <tr>
                <td>Day</td>
                <td>
                  {start.format("HH:mm:ss (dd)")} -{" "}
                  {end.isValid() ? end.format("HH:mm:ss (dd)") : null}
                </td>
              </tr>
              <tr>
                <td>Energy Expenditure</td>
                <td>{Math.round(dailyEnergyExpenditure * 100) / 100} kcal</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
  }

  private scatterPlot<T>(
    title: string,
    yLabel: string,
    arr: T[],
    dateExtractor: (datum: T) => Date,
    valueExtractor: (datum: T) => number
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
        whoop
          .sleepCycle(this.props.token, localDayStart)
          .then((days) => {
            this.setState({ ...this.state, day: days[0] });

            const sleepDayStart = moment(days[0].during.lower).toDate();
            const sleepDayEnd = days[0].during.upper
              ? moment(days[0].during.upper).toDate()
              : new Date();
            this.getHeartRate(sleepDayStart, sleepDayEnd);
          })
          .catch((error) =>
            console.error("error getting sleep cycle data", error)
          );
        break;
      case DayType.CALENDAR:
        const localDayEnd = new Date(this.state.date);
        localDayEnd.setSeconds(localDayEnd.getSeconds() + 86400);
        this.getHeartRate(localDayStart, localDayEnd);
        break;
    }
  };

  private getHeartRate = (start: Date, end: Date) => {
    whoop
      .heartRate(this.props.token, start, end)
      .then((hr) => this.setState({ ...this.state, hr }))
      .catch((error) => console.error("error updating the heartRate", error));
  };

  private formatDate = (date: Date): string => {
    return (
      date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear()
    );
  };

  private parseDate = (str: string): Date => {
    return new Date(str);
  };

  private energyExpenditure = (heartRate: number, pnoe: IPnoeState): number => {
    if (heartRate < pnoe.r2LowerBound) {
      return pnoe.r1Const / 1440;
    }

    if (heartRate < pnoe.r3LowerBound) {
      return (pnoe.r2Multiplier * heartRate + pnoe.r2Const) / 1440;
    }

    return (pnoe.r3Multiplier * heartRate + pnoe.r3Const) / 1440;
  };

  private updateR1Const = (num: number, r1Const: string) => {
    localStorage.setItem("pnoe.r1Const", r1Const);
    this.setState({ ...this.state, form: { ...this.state.form, r1Const } });
  };

  private updateR2LowerBound = (num: number, r2LowerBound: string) => {
    localStorage.setItem("pnoe.r2LowerBound", r2LowerBound);
    this.setState({
      ...this.state,
      form: { ...this.state.form, r2LowerBound },
    });
  };

  private updateR2Const = (num: number, r2Const: string) => {
    localStorage.setItem("pnoe.r2Const", r2Const);
    this.setState({ ...this.state, form: { ...this.state.form, r2Const } });
  };

  private updateR2Multiplier = (num: number, r2Multiplier: string) => {
    localStorage.setItem("pnoe.r2Multiplier", r2Multiplier);
    this.setState({
      ...this.state,
      form: { ...this.state.form, r2Multiplier },
    });
  };

  private updateR3LowerBound = (num: number, r3LowerBound: string) => {
    localStorage.setItem("pnoe.r3LowerBound", r3LowerBound);
    this.setState({
      ...this.state,
      form: { ...this.state.form, r3LowerBound },
    });
  };

  private updateR3Const = (num: number, r3Const: string) => {
    localStorage.setItem("pnoe.r3Const", r3Const);
    this.setState({ ...this.state, form: { ...this.state.form, r3Const } });
  };

  private updateR3Multiplier = (num: number, r3Multiplier: string) => {
    localStorage.setItem("pnoe.r3Multiplier", r3Multiplier);
    this.setState({
      ...this.state,
      form: { ...this.state.form, r3Multiplier },
    });
  };

  private updateObservationDate = (date: Date) => {
    this.setState({ ...this.state, date }, () => this.getData());
  };

  private updateDayType: React.FormEventHandler<HTMLInputElement> = (evt) => {
    const dayType = this.parseDayType((evt.target as HTMLInputElement).value);
    this.setState({ ...this.state, dayType }, this.getData);
  };

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
