$ErrorActionPreference='Stop'
$fishRoot=$PSScriptRoot
$fishSdk=dotnet --list-sdks | Select-Object -Last 1
if($fishSdk -notmatch '^([^ ]+) \[(.+)\]$'){throw 'Missing .NET SDK'}
$fishCompiler=Join-Path (Join-Path $Matches[2] $Matches[1]) 'Roslyn/bincore/csc.dll'
$fishFramework=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$fishArgs=@($fishCompiler,'/nologo','/target:exe','/platform:x64',('/out:'+(Join-Path $fishRoot 'app/helper/NativeDesktop.exe')))
foreach($fishAssembly in @('mscorlib','System','System.Core','Microsoft.CSharp','System.Web.Extensions','System.Windows.Forms','System.Drawing')){$fishArgs+='/reference:'+(Join-Path $fishFramework ($fishAssembly+'.dll'))}
foreach($fishSource in @('Compat.cs','Desktop.cs','ListViewDesktop.cs','FoodWidgets.cs','NativeHost.cs')){$fishArgs+=Join-Path $fishRoot ('native/'+$fishSource)}
& dotnet @fishArgs
if($LASTEXITCODE -ne 0){throw 'Native food widgets failed to build'}
