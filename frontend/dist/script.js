class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isNumberDrawn: Array(76).fill(false),
      cardNumber: [],
      ws: new WebSocket('wss://gaudy-mango.glitch.me/'),
      chosenPattern: Array(25).fill(false),
      cardMatches: Array(25).fill(' '),
      mode: "idle",
      isNewGame: true,
      totalUsers: 0,
      spectators: 0,
      activePlayers: 0 };

  }
  componentDidMount() {
    const socket = this.state.ws;
    let hasWon = false;
    socket.onmessage = evt => {
      if (typeof evt.data === "string") {//prevent empty blob object from crashing the app
        let msg = JSON.parse(evt.data);
        if ("numbers" in msg) {
          let cardData = msg.numbers;
          cardData[2].splice(2, 0, "X");
          this.setState({ cardNumber: cardData });
        } else
        if ("newBall" in msg) {
          let newBallStatus = this.state.isNewGame ? Array(76).fill(false) : this.state.isNumberDrawn;
          newBallStatus[msg.newBall] = true;
          let matches = this.state.cardMatches;
          for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
              if (msg.newBall === this.state.cardNumber[i][j]) {
                if (!matches[j * 5 + i]) matches[j * 5 + i] = true;
                console.log(matches);
              }
            }
          }
          if (matches.some(m => typeof m === "boolean")) {
            for (let i = 0; i < 25; i++) {
              if (!matches[i]) {
                hasWon = false;
                break;
              }
              if (i === 24 && !hasWon) {
                hasWon = true;
                this.state.ws.send(JSON.stringify({ whoWon: this.state.cardNumber }));
                console.log("We have a winner");
              }
            }
          }
          this.setState({ isNumberDrawn: newBallStatus, cardMatches: matches, mode: "active", isNewGame: false });
        } else
        if ("pattern" in msg) {
          let matches = this.state.cardMatches;
          for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
              if (msg.pattern[j][i]) matches[j * 5 + i] = false;
            }
          }
          matches[12] = true; //bonus
          console.log(matches);
          this.setState({ chosenPattern: msg.pattern, cardMatches: matches });
        } else
        if ("announcement" in msg) {
          this.setState({ mode: "idle", isNewGame: true });
        } else
        if ("userCount" in msg) {
          this.setState({ totalUsers: msg.userCount[1], activePlayers: msg.userCount[0], spectators: msg.userCount[1] - msg.userCount[0] });
        } else
        console.log(msg);
      }
    };
    socket.onclose = evt => {
      this.setState({ mode: "disconnected" });
    };
  }

  startGame() {
    this.setState({ mode: "waiting" });
    this.state.ws.send(JSON.stringify({ isReady: true }));
  }

  render() {
    return /*#__PURE__*/(
      React.createElement("div", { id: "app" }, /*#__PURE__*/
      React.createElement(BingoTable, { isNumberDrawn: this.state.isNumberDrawn }), /*#__PURE__*/
      React.createElement(CurrentPattern, { pattern: this.state.chosenPattern, matches: this.state.cardMatches }), /*#__PURE__*/
      React.createElement(UserCounter, { totalUsers: this.state.totalUsers, activeUsers: this.state.activePlayers, spectators: this.state.spectators }), /*#__PURE__*/
      React.createElement(StartGame, { mode: this.state.mode, ready: () => this.startGame() }), /*#__PURE__*/
      React.createElement(BingoCard, { numbers: this.state.cardNumber, isNumberDrawn: this.state.isNumberDrawn, matches: this.state.cardMatches })));

  }}


class BingoTable extends React.Component {
  render() {
    let letters = ["B", "I", "N", "G", "O"];
    return /*#__PURE__*/(
      React.createElement("table", { id: "bingoTable" }, /*#__PURE__*/
      React.createElement("tbody", null,
      letters.map((l, i) => /*#__PURE__*/
      React.createElement("tr", { key: i }, /*#__PURE__*/React.createElement("td", { className: "letterDisplay" }, l),
      [...Array(15).keys()].map((j) => /*#__PURE__*/
      React.createElement("td", { key: 15 * i + j + 1, className:
        this.props.isNumberDrawn[15 * i + j + 1] ?
        "selectedNumDisplay" : "numDisplay" },
      15 * i + j + 1)))))));



  }}


class CurrentPattern extends React.Component {
  render() {
    let tableContents = [];
    for (let i = 0; i < 5; i++) {
      let rowContents = [];
      for (let j = 0; j < 5; j++) {
        rowContents.push( /*#__PURE__*/
        React.createElement("td", { key: i * 5 + j, className: "patternDisplay" }, i === 2 && j === 2 ? /*#__PURE__*/
        React.createElement("span", { style: { fontSize: 10 } }, "FREE") :
        this.props.pattern[i][j] && /*#__PURE__*/React.createElement("span", { style: { color: this.props.matches[i * 5 + j] ? "red" : "black" } }, "X")));

      }
      tableContents.push( /*#__PURE__*/React.createElement("tr", { key: i }, rowContents));
    }

    let letters = ["B", "I", "N", "G", "O"];

    return /*#__PURE__*/(
      React.createElement("table", { id: "currentPattern" }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/
      React.createElement("tr", null, letters.map((l, i) => /*#__PURE__*/React.createElement("th", { key: i, className: "patternDisplay" }, l)))), /*#__PURE__*/

      React.createElement("tbody", null, tableContents)));

  }}


class UserCounter extends React.Component {
  render() {
    return /*#__PURE__*/React.createElement("div", { id: "userCounter" }, "Total users: ", this.props.totalUsers, "|Active users: ", this.props.activeUsers, "|Spectators: ", this.props.spectators);
  }}


class BingoCard extends React.Component {
  render() {
    let tableContents = [];
    for (let i = 0; i < 5; i++) {
      let rowContents = [];
      for (let j = 0; j < 5; j++) {
        let numColor = this.props.numbers.length > 1 && this.props.isNumberDrawn[this.props.numbers[j][i]] ? "red" : "black";
        rowContents.push( /*#__PURE__*/React.createElement("td", { key: i * 5 + j, className: "patternDisplay" }, i === 2 && j === 2 ? /*#__PURE__*/
        React.createElement("span", { style: { fontSize: 10 } }, "FREE") : /*#__PURE__*/
        React.createElement("span", { style: { color: numColor } }, this.props.numbers.length > 1 && this.props.numbers[j][i])));

      }
      tableContents.push( /*#__PURE__*/React.createElement("tr", { key: i }, rowContents));
    }

    let letters = ["B", "I", "N", "G", "O"];

    return /*#__PURE__*/(
      React.createElement("table", { style: { float: "left", width: "50%" }, id: "bingoCard" }, /*#__PURE__*/
      React.createElement("thead", null, /*#__PURE__*/
      React.createElement("tr", null, letters.map((l, i) => /*#__PURE__*/React.createElement("th", { key: i, className: "patternDisplay" }, l)))), /*#__PURE__*/

      React.createElement("tbody", null, tableContents)));

  }}


class StartGame extends React.Component {
  render() {
    let buttonText;
    switch (this.props.mode) {
      case "active":
        buttonText = "Game ongoing";
        break;
      case "waiting":
        buttonText = "Waiting for others";
        break;
      case "disconnected":
        buttonText = "Connection lost";
        break;
      case "idle":
        buttonText = "Start game";
        break;
      default:
        buttonText = "Waiting for server";
        break;}

    return /*#__PURE__*/React.createElement("button", { style: { float: "left" }, onClick: this.props.ready, id: "startButton" }, buttonText);
  }}


ReactDOM.render( /*#__PURE__*/React.createElement(App, null), document.getElementById("main"));