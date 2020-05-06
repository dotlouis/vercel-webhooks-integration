const { withUiHook, htm } = require('@zeit/integration-utils')

module.exports = withUiHook(async ({ payload, zeitClient }) => {
  const { clientState, action } = payload
  const store = await zeitClient.getMetadata()
  const isWebhookSet =
    action === 'submit' || (action === 'view' && !!store.webhookData)

  async function createHook(url) {
    return await zeitClient.fetchAndThrow(`/v1/integrations/webhooks`, {
      method: 'POST',
      data: {
        name: 'webhooks-platform-events',
        url,
      },
    })
  }

  async function removeHook(id) {
    const res = await zeitClient.fetch(`/v1/integrations/webhooks/${id}`, {
      method: 'DELETE',
    })
    if (res.status !== 204) {
      throw new Error(
        `Failed to delete hook with id ${id} error: ${await res.text()}`,
      )
    }
  }

  if (action === 'submit') {
    store.webhookData = await createHook(clientState.webhookUrl)
    await zeitClient.setMetadata(store)
  }

  if (action === 'remove') {
    await removeHook(store.webhookData.id)
    store.webhookData = null
    await zeitClient.setMetadata(store)
  }

  return htm`
		<Page>
			<Container>
				<Input label="WebhookUrl" name="webhookUrl" value=${
          (store.webhookData && store.webhookData.url) || ''
        } />
				${
          isWebhookSet
            ? htm`<Button action="remove">Remove</Button>`
            : htm`<Button action="submit">Add</Button>`
        }
			</Container>
		</Page>
	`
})
