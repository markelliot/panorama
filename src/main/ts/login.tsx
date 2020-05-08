import {
    Button,
    FormGroup,
    H3,
    InputGroup,
    Intent,
    Spinner,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import React from "react";
import { HeartRate } from "./heartRate";
import "./login.scss";
import { IWhoopToken } from "./whoop";
import * as whoop from "./whoop";

enum LoginFlowState {
    prompt,
    busy,
    fail,
    success,
}

interface ILoginState {
    email: string;
    failureMessage: string;
    password: string;
    state: LoginFlowState;
    token?: IWhoopToken;
}

export class Login extends React.Component<{}, ILoginState> {
    public state: ILoginState = {
        email: "",
        failureMessage: "",
        password: "",
        state: LoginFlowState.prompt,
    };

    public componentDidMount() {
        let updatedState = {};
        if (this.state.email.length === 0) {
            const storageEmail = localStorage.getItem("whoop.email");
            if (storageEmail) {
                updatedState = {
                    ...updatedState,
                    email: storageEmail,
                };
            }
        }
        if (this.state.password.length === 0) {
            const storagePassword = localStorage.getItem("whoop.password");
            if (storagePassword) {
                updatedState = {
                    ...updatedState,
                    password: storagePassword,
                };
            }
        }
        if (!this.state.token) {
            const storageToken = localStorage.getItem("whoop.token");
            if (storageToken) {
                const token = JSON.parse(storageToken);
                if (new Date() < new Date(token.validUntil)) {
                    updatedState = {
                        ...updatedState,
                        state: LoginFlowState.success,
                        token,
                    };
                }
            }
        }
        this.setState({ ...this.state, ...updatedState });
    }

    public render() {
        switch (this.state.state) {
            case LoginFlowState.fail:
            case LoginFlowState.prompt:
                return (
                    <div className="login">
                        <div>
                            <H3>Login</H3>
                            {this.state.failureMessage.length > 0 ? (
                                <p>{this.state.failureMessage}</p>
                            ) : (
                                    ""
                                )}
                            <form onSubmit={this.doSubmit}>
                                <FormGroup label="WHOOP Email" labelFor="email">
                                    <InputGroup
                                        id="email"
                                        placeholder="Enter your WHOOP email address.."
                                        leftIcon={IconNames.ENVELOPE}
                                        value={this.state.email}
                                        onChange={this.updateEmail}
                                    />
                                </FormGroup>
                                <FormGroup
                                    label="WHOOP Password"
                                    labelFor="password"
                                    helperText="Your password will only be used to login to WHOOP and not stored on any server."
                                >
                                    <InputGroup
                                        id="password"
                                        placeholder="Enter your WHOOP password.."
                                        type="password"
                                        leftIcon={IconNames.LOCK}
                                        value={this.state.password}
                                        onChange={this.updatePassword}
                                    />
                                </FormGroup>
                                <Button
                                    type="submit"
                                    intent={Intent.PRIMARY}
                                    fill={true}
                                    text="Login"
                                    rightIcon={IconNames.ARROW_RIGHT}
                                    disabled={
                                        this.state.email.length === 0 ||
                                        this.state.password.length === 0
                                    }
                                    onClick={this.login}
                                />
                            </form>
                        </div>
                    </div>
                );
            case LoginFlowState.busy:
                return (
                    <div className="login">
                        <div>
                            <H3>Login</H3>
                            <Spinner />
                        </div>
                    </div>
                );
            case LoginFlowState.success:
                return <HeartRate token={this.state.token!} />;
        }
    }

    private updateEmail = (event: any) => {
        this.setState({ ...this.state, email: event.target.value });
    }

    private updatePassword = (event: any) => {
        this.setState({ ...this.state, password: event.target.value });
    }

    private doSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        this.login();
    }

    private login = () => {
        localStorage.setItem("whoop.email", this.state.email);
        localStorage.setItem("whoop.password", this.state.password);
        this.setState({ ...this.state, state: LoginFlowState.busy });
        whoop
            .login(this.state.email, this.state.password)
            .then((token) => {
                localStorage.setItem("whoop.token", JSON.stringify(token));
                this.setState({
                    ...this.state,
                    state: LoginFlowState.success,
                    token,
                });
            })
            .catch((error) => {
                this.setState({
                    ...this.state,
                    failureMessage: error,
                    state: LoginFlowState.fail,
                });
            });
    }
}
