function snowflakeToDate(id) {
    const snowflake = BigInt(id);
    const timestamp = (snowflake >> 22n) + 1288834974657n;
    return new Date(Number(timestamp));
}

module.exports = { snowflakeToDate };