// import { BlockStack, FormLayout, TextField, Button, Text, Banner, Spinner, Box, InlineStack, Badge } from '@shopify/polaris' // All imports removed

/**
 * Renders the UI for the "Connection" step (FTP specific).
 * Includes the form, test button, status banners, and data preview.
 */
function WizardStepConnectionFtp({
  stepTitle,
  ftpHost,
  setFtpHost,
  ftpHostId,
  ftpPort,
  setFtpPort,
  ftpPortId,
  ftpUser,
  setFtpUser,
  ftpUserId,
  ftpPassword,
  setFtpPassword,
  ftpPasswordId,
  filePath,
  setFilePath,
  filePathId,
  dataPath,
  setDataPath,
  dataPathId,
  handleTestConnectionClick,
  testConnectionMutation,
  downloadMutation,
  truncatedPreviewString,
  dataPathError,
  remoteData,
  productCount,
}) {
  const isConnectionStepLoading =
    testConnectionMutation.isPending || downloadMutation.isPending

  const hasPreviewData = truncatedPreviewString && 
                         !truncatedPreviewString.startsWith('{ info:') && 
                         !truncatedPreviewString.startsWith('{ error:');

  return (
    <div> {/* Replaced outer BlockStack */}
      <div style={{ padding: 'var(--p-space-400)' }}> {/* Kept padding, var might not work */}
        <div> {/* Replaced inner BlockStack */}
          <h2>{stepTitle}</h2> {/* Replaced Text headingMd */}
          <div> {/* Replaced FormLayout */}
            <p> {/* Replaced Text bodyMd */}
              Enter the connection details for your FTP server and test the
              connection.
            </p>
            <div> {/* Replaced FormLayout.Group */}
              <div> {/* TextField for ftpHost */}
                <label htmlFor={ftpHostId}>FTP Host</label>
                <input
                  type="text"
                  id={ftpHostId}
                  value={ftpHost}
                  onChange={(e) => setFtpHost(e.target.value)}
                  autoComplete="off"
                  placeholder="ftp.example.com"
                  disabled={isConnectionStepLoading}
                />
                <p><small>The hostname without protocol (e.g. ftp.example.com)</small></p>
              </div>
              <div> {/* TextField for ftpPort */}
                <label htmlFor={ftpPortId}>Port</label>
                <input
                  type="number"
                  id={ftpPortId}
                  value={ftpPort}
                  onChange={(e) => setFtpPort(e.target.value)}
                  autoComplete="off"
                  placeholder="21"
                  disabled={isConnectionStepLoading}
                />
                <p><small>Default: 21 (FTP)</small></p>
              </div>
            </div>
            <div> {/* TextField for ftpUser */}
              <label htmlFor={ftpUserId}>Username</label>
              <input
                type="text"
                id={ftpUserId}
                value={ftpUser}
                onChange={(e) => setFtpUser(e.target.value)}
                autoComplete="off"
                disabled={isConnectionStepLoading}
              />
            </div>
            <div> {/* TextField for ftpPassword */}
              <label htmlFor={ftpPasswordId}>Password</label>
              <input
                type="password"
                id={ftpPasswordId}
                value={ftpPassword}
                onChange={(e) => setFtpPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isConnectionStepLoading}
              />
            </div>
            <div> {/* TextField for filePath */}
              <label htmlFor={filePathId}>File Path</label>
              <input
                type="text"
                id={filePathId}
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                autoComplete="off"
                placeholder="/path/to/your/productdata.json"
                disabled={isConnectionStepLoading}
              />
              <p><small>The exact path to the JSON file on the server.</small></p>
            </div>
            <div> {/* TextField for dataPath */}
              <label htmlFor={dataPathId}>Data Path (Optional)</label>
              <input
                type="text"
                id={dataPathId}
                value={dataPath}
                onChange={(e) => setDataPath(e.target.value)}
                autoComplete="off"
                placeholder="products or data.items[0].details"
                disabled={isConnectionStepLoading || remoteData === null}
              />
              <p><small>Path to the product array/object (e.g., 'products' or 'data.items[0]'). Dot notation and array indices supported.</small></p>
              {dataPathError && <p style={{ color: 'red' }}>Error: {dataPathError}</p>} {/* Display dataPathError */}
            </div>

            {/* Connection Test Status */}
            {testConnectionMutation.isError && (
              <div className="banner critical"> {/* Replaced Banner */}
                <h4>Connection Failed</h4>
                <p>
                  {testConnectionMutation.error instanceof Error
                    ? testConnectionMutation.error.message
                    : String(testConnectionMutation.error)}
                </p>
              </div>
            )}

            {testConnectionMutation.isSuccess && downloadMutation.isPending && !testConnectionMutation.isError && (
                 <div className="banner info"> {/* Replaced Banner */}
                    <h4>Connection Successful</h4>
                    <p>Connection verified. Attempting to download data...</p>
                 </div>
            )}

            {downloadMutation.isError && !testConnectionMutation.isError && (
              <div className="banner warning"> {/* Replaced Banner */}
                <h4>Data Download Failed</h4>
                <p>
                  Connection worked, but failed to download or read the file at the
                  specified path: {' '}
                  {downloadMutation.error instanceof Error
                    ? downloadMutation.error.message
                    : String(downloadMutation.error)}
                </p>
              </div>
            )}

            {downloadMutation.isSuccess && !testConnectionMutation.isError && !downloadMutation.isError &&(
              <div className="banner success"> {/* Replaced Banner */}
                <h4>Data Downloaded Successfully</h4>
                <p>File downloaded. Preview generated below.</p>
              </div>
            )}

            {(() => {
              // Helper to detect the specific mock connection mode
              const isSpecificMockConnection = ftpHost && ftpHost.trim().toLowerCase() === 'ftp.fightclub.nl'
                && ftpUser && ftpUser === 'Fightclub'
                && ftpPassword && ftpPassword === 'Pixels';

              // Button is enabled if:
              // 1. It's the specific mock connection AND filePath is provided
              // OR
              // 2. It's NOT the specific mock connection AND all fields (host, user, pass, path) are provided
              // AND it's not currently loading.
              const isEnabled = (
                (isSpecificMockConnection && !!filePath)
                ||
                (!isSpecificMockConnection && !!ftpHost && !!ftpUser && !!ftpPassword && !!filePath)
              ) && !isConnectionStepLoading;
              const isDisabled = !isEnabled; // Button is disabled if not enabled

              return (
                <button
                  onClick={handleTestConnectionClick}
                  disabled={isDisabled}
                >
                  {isConnectionStepLoading ? 'Loading...' : 'Test Connection & Fetch Data'}
                </button>
              );
            })()}

            {/* Data Preview Section */}
            <div> {/* Replaced BlockStack */}
              <div> {/* Replaced InlineStack */}
                <h3>Data Preview</h3> {/* Replaced Text headingSm */}
                {productCount && productCount > 1 && (
                  <span>{productCount} products found</span> /* Replaced Badge */
                )}
              </div>

              {dataPathError && !isConnectionStepLoading && (
                <div className="banner warning">{/* Replaced Banner status */}
                    <p>{dataPathError}</p>
                </div>
              )}

              {!isConnectionStepLoading && hasPreviewData && !dataPathError && (
                  <div> {/* Replaced Box */}
                    <p> {/* Replaced Text bodySm for preview path */}
                      {dataPath
                        ? `Preview of data from path: "${dataPath}"`
                        : 'Preview of data from file root'}
                    </p>
                    <pre
                      style={{
                        // Removed marginTop, fontSize with Polaris vars
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      {truncatedPreviewString}
                    </pre>
                  </div>
                )}
              {!isConnectionStepLoading && !hasPreviewData &&
                !testConnectionMutation.isError &&
                !downloadMutation.isError &&
                !dataPathError && (
                  <p> {/* Replaced Text tone="subdued" */}
                    Click "Test Connection & Fetch Data" to see a preview.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WizardStepConnectionFtp 