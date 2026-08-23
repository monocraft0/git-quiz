package com.example.app.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import java.net.URI

// DynamoDB Local を向く EnhancedClient を提供する。
// 本番は endpoint を空にすれば標準のリージョン解決に従う。
@Configuration
class DynamoDbConfig(
    @Value("\${aws.dynamodb.endpoint:}") private val endpoint: String,
    @Value("\${aws.region:ap-northeast-1}") private val region: String,
    @Value("\${aws.accessKeyId:local}") private val accessKeyId: String,
    @Value("\${aws.secretAccessKey:local}") private val secretAccessKey: String,
) {
    @Bean
    fun dynamoDbClient(): DynamoDbClient {
        val builder = DynamoDbClient.builder()
            .region(Region.of(region))
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretAccessKey),
                ),
            )
        if (endpoint.isNotBlank()) {
            builder.endpointOverride(URI.create(endpoint))
        }
        return builder.build()
    }

    @Bean
    fun dynamoDbEnhancedClient(dynamoDbClient: DynamoDbClient): DynamoDbEnhancedClient =
        DynamoDbEnhancedClient.builder()
            .dynamoDbClient(dynamoDbClient)
            .build()
}
