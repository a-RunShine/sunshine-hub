package com.sunshinefps;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sunshinefps.shared.ErrorCode;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

class ErrorCodeContractTest {

    private static final Path CONTRACT = Path.of("api", "openapi.yaml");

    @Test
    void errorCodeEnumMatchesContract() throws IOException {
        Set<String> inContract = contractErrorCodes();
        Set<String> inJava =
                Arrays.stream(ErrorCode.values())
                        .map(Enum::name)
                        .collect(Collectors.toCollection(TreeSet::new));

        Set<String> missingInJava = difference(inContract, inJava);
        Set<String> missingInContract = difference(inJava, inContract);

        assertTrue(
                missingInJava.isEmpty() && missingInContract.isEmpty(),
                () ->
                        "ErrorCode 与 api/openapi.yaml 不一致：契约里有、Java 缺 "
                                + missingInJava
                                + "；Java 有、契约缺 "
                                + missingInContract);
    }

    @SuppressWarnings("unchecked")
    private static Set<String> contractErrorCodes() throws IOException {
        assertTrue(Files.exists(CONTRACT), "找不到契约文件：" + CONTRACT.toAbsolutePath());

        try (InputStream in = Files.newInputStream(CONTRACT)) {
            Map<String, Object> root = new Yaml().load(in);
            Map<String, Object> schemas =
                    (Map<String, Object>)
                            ((Map<String, Object>) root.get("components")).get("schemas");
            Map<String, Object> errorCode = (Map<String, Object>) schemas.get("ErrorCode");
            List<String> enumValues = (List<String>) errorCode.get("enum");
            return new TreeSet<>(enumValues);
        }
    }

    private static Set<String> difference(Set<String> left, Set<String> right) {
        Set<String> result = new TreeSet<>(left);
        result.removeAll(right);
        return result;
    }
}
