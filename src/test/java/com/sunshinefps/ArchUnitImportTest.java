package com.sunshinefps;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

/**
 * 防止 ArchUnit 静默失效。
 *
 * <p>{@code archunit.properties} 里为了骨架阶段关掉了 {@code failOnEmptyShould}，代价是「规则没匹配到类」 和「字节码根本读不了」在
 * ArchUnit 眼里是同一种失败，都是静默通过。
 *
 * <p>这件事真的发生过：ArchUnit 1.3.0 读不了 Java 25 的字节码，{@code importPackages} 返回 0 个类，
 * 七条规则全绿。所以这个测试断言扫描结果里必须有几个必然存在的类，用「存在性」而不是数字基线， 加模块时不会误报。
 */
class ArchUnitImportTest {

    @Test
    void 扫描结果要包含启动类和四个_Facade() {
        var classes =
                new ClassFileImporter()
                        .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                        .importPackages("com.sunshinefps");

        assertThat(classes)
                .as("ArchUnit 扫到 0 个类说明字节码读不了，架构规则全部形同虚设")
                .extracting(JavaClass::getSimpleName)
                .contains(
                        "SunshineFpsApplication",
                        "IdentityFacade",
                        "CatalogFacade",
                        "TradeFacade",
                        "ContentFacade");
    }
}
