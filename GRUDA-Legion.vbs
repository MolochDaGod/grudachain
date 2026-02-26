Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
ScriptPath = WScript.ScriptFullName
ScriptDir = FSO.GetParentFolderName(ScriptPath)

' Change to the script directory
WshShell.CurrentDirectory = ScriptDir

' Show a simple message
WScript.Echo "🏴‍☠️ GRUDA Legion v3.0 Starting..."
WScript.Echo "Initializing AI systems and services..."

' Check if PowerShell script exists
PSScript = ScriptDir & "\GRUDA-Legion.ps1"
If FSO.FileExists(PSScript) Then
    ' Run PowerShell script with execution policy bypass
    Command = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Normal -File """ & PSScript & """"
    
    ' Execute the command
    WshShell.Run Command, 1, False
Else
    ' Fallback to batch file
    BatchScript = ScriptDir & "\GRUDA-Legion.bat"
    If FSO.FileExists(BatchScript) Then
        WshShell.Run """" & BatchScript & """", 1, False
    Else
        WScript.Echo "❌ Error: GRUDA Legion scripts not found!"
        WScript.Echo "Please ensure GRUDA-Legion.ps1 or GRUDA-Legion.bat exists in the same directory."
        WScript.Quit 1
    End If
End If
