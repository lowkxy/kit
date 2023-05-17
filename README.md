<p align="center" style="margin-bottom: 0px !important;">
  <img width="200" src="https://i.ibb.co/RNTcyyX/swords-removebg-preview.png" alt="swords" align="center">
</p>
<h1 align="center" style="margin-top: 0px;">Kit Collector</h1>

<p align="center">Most efficient way to collect your kits!</p>

## Installation

- Download [nodejs](https://nodejs.org/en/download) on your computer.
- Open a command prompt in your [folder's directory](https://www.youtube.com/watch?v=bgSSJQolR0E).
- Install dependencies.
```bash
npm install
```
- Run index.js.
```bash
cd src
node index.js
```
## FAQ

### What if all my accounts have different passwords?

That's simple, just put a coloumn between them in the usernames text file, like so:

```txt
Account1
Account2
Account3
Account4:IHaveADifferentPassword
Account5
```

### It checks the API everytime, how can I avoid that?

Just open up index.js with notepad or so, and comment out the rankchecker function.
```js
// await rankChecker(userArr)
```
**Note:** This will skip it everytime, if you add a new alt to usernames.txt, get a rank on a new alt or rank-upgrade one of them, make sure to uncomment it so it updates.

### Does this work on all modes?

No, it works on opsb, opfac and opp. To change modes, open config.json file and change the server, no shortforms.

### Where is the usernames text file & config json?

They will be created with prompts on your first run. However, you can create the usernames.txt yourself.

## Features

- Works on Linux, macOS, Microsoft Windows.
- Supports all modes.
- Saves ranks locally in a database.
- Fast and time-efficient.

## Feedback

If you have any feedback or you require support, reach out to me on discord.  
-elchapo#1337