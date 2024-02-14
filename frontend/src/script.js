class App extends React.Component{
	constructor(props){
		super(props);
		this.state = {isNumberDrawn: Array(76).fill(false),
						cardNumber: [],
						ws: new WebSocket('wss://gaudy-mango.glitch.me/'),
						chosenPattern: Array(25).fill(false),
						cardMatches: Array(25).fill(' '),
						mode: "idle",
						isNewGame: true,
						totalUsers: 0,
						spectators: 0,
						activePlayers: 0
					}
	}
	componentDidMount(){
		const socket = this.state.ws;
		let hasWon = false;
		socket.onmessage = evt => {
			if (typeof evt.data === "string"){ //prevent empty blob object from crashing the app
				let msg = JSON.parse(evt.data);
				if ("numbers" in msg){
					let cardData = msg.numbers;
					cardData[2].splice(2, 0, "X");
					this.setState({cardNumber: cardData});
				}
				else if ("newBall" in msg){
					let newBallStatus = this.state.isNewGame ? Array(76).fill(false) : this.state.isNumberDrawn;
					newBallStatus[msg.newBall] = true;
					let matches = this.state.cardMatches;
					for (let i = 0; i < 5; i++){
						for (let j = 0; j < 5; j++){
							if (msg.newBall === this.state.cardNumber[i][j]){
								if(!matches[j*5+i]) matches[j*5+i] = true;
								console.log(matches);
							}
						}
					}
					if (matches.some(m => typeof m === "boolean")){
						for (let i = 0; i < 25; i++){
							if (!matches[i]){
								hasWon = false;
								break;
							}
							if (i === 24 && !hasWon){
								hasWon = true;
								this.state.ws.send(JSON.stringify({whoWon: this.state.cardNumber}));
								console.log("We have a winner");
							}
						}
					}
					this.setState({isNumberDrawn: newBallStatus, cardMatches: matches, mode: "active", isNewGame: false});
				}
				else if ("pattern" in msg){
					let matches = this.state.cardMatches;
					for (let i = 0; i < 5; i++){
						for (let j = 0; j < 5; j++){
							if(msg.pattern[j][i]) matches[j*5+i] = false;
						}
					}
					matches[12] = true; //bonus
					console.log(matches);
					this.setState({chosenPattern: msg.pattern, cardMatches: matches})
				}
				else if ("announcement" in msg){
					this.setState({mode: "idle", isNewGame: true});
				}
				else if ("userCount" in msg){
					this.setState({totalUsers: msg.userCount[1], activePlayers: msg.userCount[0], spectators: msg.userCount[1] - msg.userCount[0]})
				}
				else console.log(msg);
			}
		};
		socket.onclose = evt =>{
			this.setState({mode: "disconnected"});
		}
	}
	
	startGame(){
		this.setState({mode: "waiting"});
		this.state.ws.send(JSON.stringify({isReady: true}));
	}
	
	render(){
		return (
			<div id = "app">
				<BingoTable isNumberDrawn = {this.state.isNumberDrawn}/>
				<CurrentPattern pattern = {this.state.chosenPattern} matches = {this.state.cardMatches}/>
				<UserCounter totalUsers = {this.state.totalUsers} activeUsers = {this.state.activePlayers} spectators = {this.state.spectators}/>
				<StartGame mode = {this.state.mode} ready = {() => this.startGame()}/>
				<BingoCard numbers = {this.state.cardNumber} isNumberDrawn = {this.state.isNumberDrawn} matches = {this.state.cardMatches}/>
			</div>)
	}
}

class BingoTable extends React.Component{
	render(){
		let letters = ["B", "I", "N", "G", "O"]
		return (
			<table id = "bingoTable">
				<tbody>
					{letters.map((l, i) =>
						<tr key = {i}><td className="letterDisplay">{l}</td>
							{[...Array(15).keys()].map(j =>
								<td key = {15*i+j+1} className =
									{this.props.isNumberDrawn[15*i+j+1]?
										"selectedNumDisplay":"numDisplay"}>
									{15*i+j+1}</td>)}
						</tr>)}
				</tbody>
			</table>)
	}
}

class CurrentPattern extends React.Component{
	render(){
		let tableContents = [];
		for(let i = 0; i < 5; i++){
			let rowContents = [];
			for(let j = 0; j < 5; j++){
				rowContents.push(
				<td key = {i*5+j} className="patternDisplay">{(i === 2 && j === 2) ?
					(<span style = {{fontSize:10}}>FREE</span>) :
					this.props.pattern[i][j] && <span style = {{color: this.props.matches[i*5+j] ? "red" : "black"}}>X</span>}
				</td>)
			}
			tableContents.push(<tr key = {i}>{rowContents}</tr>)
		}
		
		let letters = ["B", "I", "N", "G", "O"];
		
		return(
			<table id = "currentPattern"><thead>
					<tr>{letters.map((l,i)=><th key = {i} className = "patternDisplay">{l}</th>)}</tr>
				</thead>
				<tbody>{tableContents}</tbody>
			</table>)
	}
}

class UserCounter extends React.Component{
	render(){
		return(<div id="userCounter">Total users: {this.props.totalUsers}|Active users: {this.props.activeUsers}|Spectators: {this.props.spectators}</div>)
	}
}

class BingoCard extends React.Component{
	render(){
		let tableContents = [];
		for(let i = 0; i < 5; i++){
			let rowContents = [];
			for(let j = 0; j < 5; j++){
				let numColor = this.props.numbers.length > 1 && this.props.isNumberDrawn[this.props.numbers[j][i]] ? "red" : "black";
				rowContents.push(<td key = {i*5+j} className="patternDisplay">{i === 2 && j === 2 ? 
							(<span style = {{fontSize:10}}>FREE</span>) :
							(<span style = {{color: numColor}}>{this.props.numbers.length > 1 && this.props.numbers[j][i]}</span>)
						}</td>)
			}
			tableContents.push(<tr key = {i}>{rowContents}</tr>)
		}
		
		let letters = ["B", "I", "N", "G", "O"];
		
		return(
			<table style = {{float: "left", width: "50%"}} id="bingoCard">
				<thead>
					<tr>{letters.map((l,i)=><th key = {i} className = "patternDisplay">{l}</th>)}</tr>
				</thead>
				<tbody>{tableContents}</tbody>
			</table>)
	}
}

class StartGame extends React.Component{
	render(){
		let buttonText;
		switch(this.props.mode){
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
				break;
		}
		return(<button style={{float: "left"}} onClick = {this.props.ready} id="startButton">{buttonText}</button>)
	}
}

ReactDOM.render(<App/>, document.getElementById("main"))