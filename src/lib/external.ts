export async function externalPriceFeed(query: {
  chainId: number;
  address: string;
}): Promise<number | null> {
  const priceAgent = "https://price-agent.vercel.app/api/tools/prices";
  const url = `${priceAgent}?chainId=${query.chainId}&address=${query.address}`;
  console.log("URL", url);
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `API call failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const { price } = await response.json();

    // Assuming the API returns a number directly
    return typeof price === "number" ? price : null;
  } catch (error) {
    console.error("Error calling price API:", error);
    return null;
  }
}
