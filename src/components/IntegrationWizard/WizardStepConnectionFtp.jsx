import {
  BlockStack,
  FormLayout,
  TextField,
  Button,
  Text,
  Banner,
  Spinner,
  Box,
  InlineStack,
  Badge,
} from '@shopify/polaris'

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

  // Determine if the preview string contains actual data (not the placeholder/error messages)
  const hasPreviewData = truncatedPreviewString && 
                         !truncatedPreviewString.startsWith('{ info:') && 
                         !truncatedPreviewString.startsWith('{ error:');

  return (
    <BlockStack gap="400" inlineAlign="start">
      <div style={{ padding: 'var(--p-space-400)' }}>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            {stepTitle}
          </Text>
          <FormLayout>
            <Text variant="bodyMd" as="p" tone="subdued">
              Enter the connection details for your FTP server and test the
              connection.
            </Text>
            <FormLayout.Group>
              <TextField
                id={ftpHostId}
                label="FTP Host"
                value={ftpHost}
                onChange={setFtpHost}
                autoComplete="off"
                placeholder="ftp.example.com"
                helpText="The hostname without protocol (e.g. ftp.example.com)"
                disabled={isConnectionStepLoading}
              />
              <TextField
                id={ftpPortId}
                label="Port"
                value={ftpPort}
                onChange={setFtpPort}
                autoComplete="off"
                type="number"
                placeholder="21"
                helpText="Default: 21 (FTP)"
                disabled={isConnectionStepLoading}
              />
            </FormLayout.Group>
            <TextField
              id={ftpUserId}
              label="Username"
              value={ftpUser}
              onChange={setFtpUser}
              autoComplete="off"
              disabled={isConnectionStepLoading}
            />
            <TextField
              id={ftpPasswordId}
              label="Password"
              value={ftpPassword}
              onChange={setFtpPassword}
              type="password"
              autoComplete="new-password"
              disabled={isConnectionStepLoading}
            />
            <TextField
              id={filePathId}
              label="File Path"
              value={filePath}
              onChange={setFilePath}
              autoComplete="off"
              placeholder="/path/to/your/productdata.json"
              helpText="The exact path to the JSON file on the server."
              disabled={isConnectionStepLoading}
            />
            <TextField
              id={dataPathId}
              label="Data Path (Optional)"
              value={dataPath}
              onChange={setDataPath} // Directly use setDataPath, effect handles processing
              autoComplete="off"
              placeholder="products or data.items[0].details"
              helpText="Path to the product array/object (e.g., 'products' or 'data.items[0]'). Dot notation and array indices supported."
              error={dataPathError} // Display processing error here
              disabled={isConnectionStepLoading || remoteData === null} // Disable if loading or no raw data yet
            />

            {/* Connection Test Status - Prioritize showing errors first */}
            {testConnectionMutation.isError && (
              <Banner title="Connection Failed" tone="critical">
                {testConnectionMutation.error instanceof Error
                  ? testConnectionMutation.error.message
                  : String(testConnectionMutation.error)}
              </Banner>
            )}

            {/* Show download pending state only if connection succeeded and download is running */}
            {testConnectionMutation.isSuccess && downloadMutation.isPending && !testConnectionMutation.isError && (
                 <Banner title="Connection Successful" tone="info">
                    Connection verified. Attempting to download data...
                 </Banner>
            )}

            {/* Show download error only if connection succeeded but download failed */}
            {downloadMutation.isError && !testConnectionMutation.isError && (
              <Banner title="Data Download Failed" tone="warning">
                Connection worked, but failed to download or read the file at the
                specified path:{' '}
                {downloadMutation.error instanceof Error
                  ? downloadMutation.error.message
                  : String(downloadMutation.error)}
              </Banner>
            )}

            {/* Show download success only if connection and download succeeded */}
            {downloadMutation.isSuccess && !testConnectionMutation.isError && !downloadMutation.isError &&(
              <Banner title="Data Downloaded Successfully" tone="success">
                File downloaded. Preview generated below.
              </Banner>
            )}

            <Button
              onClick={handleTestConnectionClick}
              loading={isConnectionStepLoading}
              disabled={!ftpHost || !ftpUser || !ftpPassword || !filePath || isConnectionStepLoading}
            >
              Test Connection & Fetch Data
            </Button>

            {/* Data Preview Section */}
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingSm" as="h3">
                  Data Preview
                </Text>
                {productCount && productCount > 1 && (
                  <Badge tone="info">{productCount} products found</Badge>
                )}
              </InlineStack>

              {/* Show data path processing error specifically */}
              {dataPathError && !isConnectionStepLoading && (
                <Banner status="warning">{dataPathError}</Banner>
              )}

              {/* Show the preview content only if not loading AND we have actual preview data */}
              {!isConnectionStepLoading && hasPreviewData && !dataPathError && (
                  <Box
                    background="bg-surface-secondary"
                    padding="400"
                    borderRadius="200"
                    overflowX="auto"
                    borderColor="border"
                    borderWidth="025"
                  >
                    <Text
                      variant="bodySm"
                      tone="subdued"
                      as="p"
                      fontWeight="medium"
                    >
                      {dataPath
                        ? `Preview of data from path: "${dataPath}"`
                        : 'Preview of data from file root'}
                    </Text>
                    <pre
                      style={{
                        marginTop: 'var(--p-space-100)',
                        fontSize: 'var(--p-font-size-75)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      {truncatedPreviewString}
                    </pre>
                  </Box>
                )}
              {/* Message when connection is fine but no preview is ready yet */}
              {!isConnectionStepLoading && !hasPreviewData &&
                !testConnectionMutation.isError &&
                !downloadMutation.isError &&
                !dataPathError && (
                  <Text tone="subdued">
                    Click "Test Connection & Fetch Data" to see a preview.
                  </Text>
                )}
            </BlockStack>
          </FormLayout>
        </BlockStack>
      </div>
    </BlockStack>
  )
}

export default WizardStepConnectionFtp 