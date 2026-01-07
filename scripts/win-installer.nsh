!macro customInstall
  ; Check if VB-Cable is already installed
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" "VB-Audio Virtual Cable"
  StrCmp $0 "" install_vbcable skip_install
  
  install_vbcable:
    ; Copy zip file to plugins directory (from project resources)
    File /oname=$PLUGINSDIR\vbcable.zip "${PROJECT_DIR}\resources\drivers\windows\vbcable.zip"
    
    ; Extract zip file using PowerShell
    ; Create extraction directory first
    CreateDirectory "$PLUGINSDIR\vbcable_extracted"
    
    ; Store paths in variables for use in PowerShell command
    StrCpy $5 "$PLUGINSDIR\vbcable.zip"
    StrCpy $6 "$PLUGINSDIR\vbcable_extracted"
    
    ; Create PowerShell script with actual paths
    FileOpen $4 "$PLUGINSDIR\extract.ps1" w
    FileWrite $4 'param($$zipPath, $$destPath)$\r$\n'
    FileWrite $4 'Expand-Archive -Path $$zipPath -DestinationPath $$destPath -Force$\r$\n'
    FileClose $4
    
    ; Execute PowerShell script with paths as parameters
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\extract.ps1" -zipPath "$5" -destPath "$6"' $1
    Delete "$PLUGINSDIR\extract.ps1"
    IntCmp $1 0 extract_success extract_error
    
    extract_error:
      MessageBox MB_OK|MB_ICONEXCLAMATION "Failed to extract VB-Cable installer. You may need to install it manually."
      Goto cleanup_zip
      
    extract_success:
      ; Execute installer from known path
      ; VBCable uses /S for silent install (NSIS standard flag)
      ExecWait '"$PLUGINSDIR\vbcable_extracted\VBCABLE_Setup_x64.exe" /S' $0
      IntCmp $0 0 success error
    
  success:
    MessageBox MB_OK "VB-Audio Virtual Cable installed successfully. Please restart your PC."
    Goto cleanup_extracted
    
  error:
    MessageBox MB_OK|MB_ICONEXCLAMATION "Failed to install VB-Audio Virtual Cable. You may need to install it manually."
    Goto cleanup_extracted
    
  cleanup_extracted:
    ; Remove extracted files and directory
    RMDir /r "$PLUGINSDIR\vbcable_extracted"
    Goto cleanup_zip
    
  cleanup_zip:
    ; Remove zip file
    Delete "$PLUGINSDIR\vbcable.zip"
    
  skip_install:
!macroend