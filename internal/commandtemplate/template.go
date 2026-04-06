package commandtemplate

import (
	"bytes"
	"runtime"
	"strings"
	"text/template"
)

type Data struct {
	CurrentFile string
}

const (
	templateName          = "command"
	validationCurrentFile = `D:\Photos\demo folder\a'b$c.png`
)

func Render(command string, data Data) (string, error) {
	return renderForGOOS(command, data, runtime.GOOS)
}

func Validate(command string) error {
	_, err := renderForGOOS(command, Data{CurrentFile: validationCurrentFile}, runtime.GOOS)
	return err
}

func renderForGOOS(command string, data Data, goos string) (string, error) {
	tmpl, err := template.New(templateName).
		Option("missingkey=error").
		Funcs(templateFuncs(goos)).
		Parse(command)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func templateFuncs(goos string) template.FuncMap {
	return template.FuncMap{
		"shell":      func(value string) string { return shellLiteralForGOOS(value, goos) },
		"powershell": powershellLiteral,
		"sh":         posixSingleQuoted,
		"slash":      normalizeSlashes,
		"pssingle":   powerShellSingleQuotedContent,
		"psdouble":   powerShellDoubleQuotedContent,
	}
}

func shellLiteralForGOOS(value, goos string) string {
	if goos == "windows" {
		return powershellLiteral(value)
	}
	return posixSingleQuoted(value)
}

func powershellLiteral(value string) string {
	return "'" + powerShellSingleQuotedContent(value) + "'"
}

func powerShellSingleQuotedContent(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}

func powerShellDoubleQuotedContent(value string) string {
	replacer := strings.NewReplacer(
		"`", "``",
		`"`, "`\"",
		"$", "`$",
		"\r", "`r",
		"\n", "`n",
		"\t", "`t",
	)
	return replacer.Replace(value)
}

func posixSingleQuoted(value string) string {
	if value == "" {
		return "''"
	}
	return "'" + strings.ReplaceAll(value, "'", `'\''`) + "'"
}

func normalizeSlashes(value string) string {
	return strings.ReplaceAll(value, `\`, "/")
}
