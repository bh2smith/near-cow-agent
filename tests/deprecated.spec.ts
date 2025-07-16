// This posts an order to COW Orderbook.
// it.skip("orderRequestFlow", async () => {
//   console.log("Requesting Quote...");
//   const signRequest = await orderRequestFlow(client, {
//     chainId,
//     quoteRequest: { ...quoteRequest, from: DEPLOYED_SAFE },
//     tokenData,
//   });
//   console.log(signRequest);
// });
// // TODO: Mock getBalances and/or sellTokenAvailable!
// it.skip("parseQuoteRequest", async () => {
//   const request = new NextRequest("https://fake-url.xyz", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "mb-metadata": JSON.stringify({
//         accountId: "neareth-dev.testnet",
//       }),
//     },
//     body: JSON.stringify(quoteRequest),
//   });
//   const tokenMap = await loadTokenMap(COW_SUPPORTED_CHAINS);
//   expect(await parseQuoteRequest(request, tokenMap)).toStrictEqual({
//     chainId: 11155111,
//     quoteRequest: {
//       buyToken: tokenData.buy.address,
//       from: DEPLOYED_SAFE,
//       kind: "sell",
//       receiver: DEPLOYED_SAFE,
//       sellAmountBeforeFee: "2000000000000000000000000000000000000",
//       sellToken: tokenData.sell.address,
//       signingScheme: "presign",
//     },
//     tokenData,
//   });
// });
