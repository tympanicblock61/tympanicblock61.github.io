document.addEventListener("DOMContentLoaded", function () {

    function sendOutput(message) {
        appendOutput(message);
    }

    function sendError(message) {
        appendOutput("Error: " + message);
    }

    function sendWarn(message) {
        appendOutput("Warning: " + message);
    }

    window.commands.sendError = sendError;
    window.commands.sendWarn = sendWarn;
    window.commands.sendOutput = sendOutput;


    const dispatcher = new CommandDispatcher("");

    function registerCommands() {
        dispatcher.register(
            new LiteralCommandNode("help")
                .setDescription("displays help about a command or all commands")
                .addChild(
                    new ArgumentCommandNode("command", new StringArgumentType({ allows: dispatcher.commands }))
                        .setDescription("the command to get help for")
                        .setOptional()
                        .execute((context) => {
                            sendOutput(dispatcher.getHelpString(context.getArgument("command")));
                        })
                )
                .execute((context) => {
                    sendOutput(dispatcher.getHelpString());
                })
        );

        dispatcher.register(
            new LiteralCommandNode("whoami")
                .setDescription("Displays who tympanicblock61 is :)")
                .execute((context) => {
                    sendOutput("Hi i am tympanicblock61 or also known as zombi\ni am a 16 year old programmer from the united states\ni am not very well known and have very few projects that i actually continue\nenjoy my site :)");
                })
        );

        var socials = {
            "discord": "zombiiess",
            "github": "https://github.com/Tympanicblock61",
            "bluesky": "https://bsky.app/profile/howlingjackel.bsky.social",
            "myanimelist": "https://myanimelist.net/profile/thehowlingjackel",
            "anilist": "https://anilist.co/user/Thehowlingjackel/"
        }

        dispatcher.register(
            new LiteralCommandNode("socials")
                .setDescription("Lists the socials i have")
                .addChild(
                    new ArgumentCommandNode("social", new StringArgumentType({ allows: Object.keys(socials) }))
                        .setDescription("the social you want to see")
                        .setOptional()
                        .execute((context) => {
                            sendOutput(context.getArgument("social") + ": " + socials[context.getArgument("social")]);
                        })
                )
                .execute((context) => {
                    var fullOutput = "";
                    for (const key of Object.keys(socials)) {
                        fullOutput += key + ": " + socials[key] + "\n";
                    }
                    sendOutput(fullOutput)
                })
        )

    }
    registerCommands();

    const terminal = document.querySelector(".commandLine");
    const commandContainer = document.querySelector(".commands");
    const commandDisplay = document.querySelector(".input-line > span:nth-child(2)");

    const appendOutput = (output) => {
        if (!output) return;

        const outputElem = document.createElement("p");
        outputElem.className = "command";
        outputElem.textContent = output;
        commandContainer.appendChild(outputElem);
        commandContainer.scrollTop = commandContainer.scrollHeight;
    };

    document.addEventListener("click", (event) => {
        terminal.classList.toggle("focused", terminal.contains(event.target) || terminal === event.target);
    });

    let command = "";
    document.addEventListener("keydown", (event) => {
        if (!terminal.classList.contains("focused")) return;

        if (event.key === "Enter") {
            sendOutput("$ " + command);
            dispatcher.dispatch(command);
            command = "";
        } else if (event.key === "Backspace") {
            command = command.slice(0, -1);
        } else if (event.key.length === 1) {
            command += event.key;
        }

        commandDisplay.textContent = command;
    });

    sendOutput("$ help");
    dispatcher.dispatch("help");
})