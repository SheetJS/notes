#!/usr/bin/env -S deno run -A
/*! dump_registry.ts (C) 2022-present SheetJS LLC -- https://sheetjs.com */

/*
NOTE: this script requires an Intel Mac, Numbers, LLDB, and Deno

USAGE: deno run -A https://oss.sheetjs.com/notes/iwa/dump_registry.ts
*/

if(Deno.build.os != "darwin") throw `Must run in macOS!`;
if(Deno.build.arch != "x86_64") throw `Must run on Intel Mac (Apple Silicon currently unsupported)`;

const p = Deno.run({ cmd: "lldb /Applications/Numbers.app/Contents/MacOS/Numbers -a x86_64".split(" "),
	stdin: "piped", stdout: "piped"
});

const doit = (x: string) => p?.stdin?.write(new TextEncoder().encode(x))

const cmds = [
	"b -[NSApplication _sendFinishLaunchingNotification]",
	"settings set auto-confirm 1",
	"breakpoint command add 1.1",
		"po [TSPRegistry sharedRegistry]",
		"process kill",
		"exit",
		"DONE",
	"run",
];
for(const cmd of cmds) await doit(cmd + "\n");

/* LLDB does not exit normally, setTimeout workaround */
setTimeout(() => p.kill("SIGKILL"), 30000)

const [status, stdout] = await Promise.all([ p.status(), p.output() ]);
await p.close();

const data = new TextDecoder().decode(stdout);
const res = data.match(/_messageTypeToPrototypeMap = {([^]*?)}/m)?.[1];
if(!res) throw `Could not find map!`
const rows = res.split(/[\r\n]+/).map(r => r.trim().split(/\s+/)).filter(x => x.length > 1);
rows.sort((l, r) => +l[0] - +r[0]);
console.log(Object.fromEntries(rows.map(r => [r[0], r[3]]).filter(r => r[1] != "null")));
